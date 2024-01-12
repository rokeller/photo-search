from collections.abc import Iterable
from datetime import datetime
from calendar import timegm
import glob
import os
import re
import requests
import sys
from shutil import copyfile, move
from sentence_transformers import SentenceTransformer
from PIL import Image, ExifTags, TiffImagePlugin
import numpy as np
from torch import Tensor

args = sys.argv[1:]

if len(args) < 2:
    print(f'usage: {sys.argv[0]} path/to/photos baseUrlToService')
    sys.exit(1)

root_dir = args[0]
target_base_url = args[1]
PHOTOS_EXTENSIONS = ('*.jpg', '*.jpeg', '*.JPG', '*.JPEG')

CHUNK_SIZE = 20
ENCODE_BATCH_SIZE = 128

CHECKPOINT_PATH = '.checkpoint'
CHECKPOINT_TEMP_PATH = '.checkpoint.temp'
CHECKPOINT_DEL_PATH = '.checkpoint.del' # Holds relative paths removed from the checkpoint

def get_photos() -> set[str]:
    '''
    Gets a set of relative file names to all photos that were found.
    '''
    photo_names = set()
    for patterns in PHOTOS_EXTENSIONS:
        for path in glob.iglob('**/' + patterns, root_dir=root_dir, recursive=True):
            photo_names.add(path)
    return photo_names

def checkpoint(file_names: Iterable[str]):
    '''
    Checkpoints the given file names. That is, the file names are added to the
    checkpoint file to make sure they're not indexed again in the future.
    '''
    if os.path.isfile(CHECKPOINT_PATH):
        copyfile(CHECKPOINT_PATH, CHECKPOINT_TEMP_PATH)

    with open(CHECKPOINT_TEMP_PATH, 'a') as f:
        for path in file_names:
            f.write(f'{path}\n')
    move(CHECKPOINT_TEMP_PATH, CHECKPOINT_PATH)

def get_checkpoint_paths() -> set[str]:
    '''
    Retrieves a set of all relative file names of photos that are in the checkpoint
    file, i.e. paths to photos that are already indexed.
    '''
    if not os.path.isfile(CHECKPOINT_PATH):
        return set()

    file_names = set()
    with open(CHECKPOINT_PATH, 'r') as f:
        while True:
            line = f.readline()
            if not line:
                break
            file_names.add(line.strip())

    if os.path.isfile(CHECKPOINT_DEL_PATH):
        with open(CHECKPOINT_DEL_PATH, 'r') as f:
            while True:
                line = f.readline()
                if not line:
                    break
                file_names.remove(line.strip())

    return file_names

def parse_exif_timestamp(timestampStr: str) -> (int | None):
    match = re.match(r'^(\d{4}).(\d{2}).(\d{2})\s+(\d{2}:\d{2}:\d{2})$', timestampStr)
    if match == None:
        return None

    isoStr = f'{match.group(1)}-{match.group(2)}-{match.group(3)} {match.group(4)}'
    dt = datetime.fromisoformat(isoStr)
    return timegm(dt.timetuple())

def sanitize_exif_tag_value(value: any) -> (list | float | str | None):
    if type(value) is list:
        vals = [sanitize_exif_tag_value(val) for val in value]
        return vals
    elif isinstance(value, tuple):
        vals = [sanitize_exif_tag_value(value[i]) for i in range(len(value))]
        return vals
    elif type(value) is TiffImagePlugin.IFDRational:
        if value.denominator == 0:
            return None
        else:
            return float(value)
    elif type(value) is bytes:
        return value.hex()
    else:
        return value

def extract_exif(img: Image) -> dict[str, any]:
    '''
    Extracts EXIF tags found in the image.
    '''
    exif = img.getexif()
    tags = { ExifTags.TAGS[k]: v for k, v in exif.items() if k in ExifTags.TAGS }
    for k, v in tags.items():
        tags[k] = sanitize_exif_tag_value(v)
    return tags

def extract_timestamp(path: str, exif_tags: dict[str, any]) -> (int | None):
    if 'DateTime' in exif_tags:
        dt = parse_exif_timestamp(exif_tags['DateTime'])
        if dt != None:
            return dt

    match = re.search('[^0-9]' +
                      '(?P<year>[12]\d{3})' +
                      '(?P<date_sep>[\-._:]?)' +
                      '(?P<month>0[1-9]|1[0-2])' +
                      '(?P=date_sep)' +
                      '(?P<day>[0-2][0-9]|3[01])' +
                      '[^0-9]+' +
                      '(?P<time>' +
                        '(?P<hour>[012]\d)' +
                        '(?P<time_sep>[\-._:]?)' +
                        '(?P<minute>[0-5]\d)' +
                        '(?P=time_sep)' +
                        '(?P<second>[0-5]\d)' +
                      ')?',
                      path)
    if match == None:
        return None

    isoStr = f'{match.group("year")}-{match.group("month")}-{match.group("day")}'
    if None == match.group('time'):
        isoStr += ' 00:00:00'
    else:
        isoStr += f' {match.group("hour")}:{match.group("minute")}:{match.group("second")}'

    dt = datetime.fromisoformat(isoStr)
    return timegm(dt.timetuple())

def calculate_embeddings(file_paths: Iterable[str]) -> Iterable[tuple[dict[str, any], Tensor]]:
    '''
    Calculates the embeddings for the photos in the given relative file paths.
    '''
    full_paths = [os.path.join(root_dir, file_path) for file_path in file_paths]
    images = [Image.open(file_path) for file_path in full_paths]
    exif_tags = [extract_exif(img) for img in images]
    timestamps = [extract_timestamp(path, tags) for (path, tags) in zip(file_paths, exif_tags)]
    payloads = [{'path':path, 'exif': tags, 'timestamp': timestamp}
                for (path, tags, timestamp) in zip(file_paths, exif_tags, timestamps)]
    embeddings = model.encode(
        images,
        batch_size=ENCODE_BATCH_SIZE,
        convert_to_tensor=True,
        show_progress_bar=False)
    return zip(payloads, embeddings)

def upload_embeddings(payloads_and_embeddings: Iterable[tuple[dict[str, any], Tensor]]) -> bool:
    '''
    Uploads embeddings for relative file paths to the indexing server.
    '''
    url = target_base_url.strip('/') + '/v1/index'
    for (payload, vector) in payloads_and_embeddings:
        body = {
            'items': [
                {
                    'p': payload,
                    'v': vector.tolist(),
                }
            ]
        }
        response = requests.post(url, json=body)
        if response.status_code != 200:
            print(f'Index error: got status {response.status_code} for file "{payload["path"]}"')
            return False
    return True

# Figure out which photos to index. That is the set of photos that exist, minus
# the set of photos that are already indexed (i.e. the photos from the checkpoint
# file).
print(f"Looking for photos to index in {root_dir} ...")
all_photos_paths = get_photos()
checkpoint_paths = get_checkpoint_paths()
size_all = len(all_photos_paths)
size_checkpoint = len(checkpoint_paths)
photos_paths = list(all_photos_paths.difference(checkpoint_paths))
num_photos = len(photos_paths)

print(f'Found {size_all} photos. {size_checkpoint} already indexed. {num_photos} to be indexed.')

num_chunks = (num_photos // CHUNK_SIZE) + 1

if num_photos <= 0:
    sys.exit(0)

if num_chunks == 1:
    chunks = [np.asarray(photos_paths)]
else:
    a_photos_paths = np.asarray(photos_paths)
    chunks = np.split(a_photos_paths, [offset * CHUNK_SIZE for offset in range(1, num_chunks)])

print('Load embedding model ...')
model = SentenceTransformer('.models/clip-ViT-B-32')

for i in range(0,len(chunks)):
    print(f'Calculating embeddings for chunk {i + 1}/{num_chunks} ({(i / num_chunks * 100):.2f}% done)...')
    payloads_and_embeddings = calculate_embeddings(chunks[i])
    if upload_embeddings(payloads_and_embeddings):
        # Write to the checkpoint file so we know not to do the same photos again.
        checkpoint(np.asarray(chunks[i]))
    else:
        print(f"Failed to index some photos. paths: {chunks[i]}")
