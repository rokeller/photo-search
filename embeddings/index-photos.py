import glob
import os
import sys
import requests
from shutil import copyfile, move
from sentence_transformers import SentenceTransformer
from PIL import Image
import numpy as np

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

print(f"Looking for photos to index in {root_dir} ...")

def get_photos():
    '''
    Gets a set of relative file names to all photos that were found.
    '''
    photo_names = set()
    for patterns in PHOTOS_EXTENSIONS:
        for path in glob.iglob('**/' + patterns, root_dir=root_dir, recursive=True):
            photo_names.add(path)
    return photo_names

def checkpoint(file_names):
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

def get_checkpoint_paths():
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

    return file_names

def calculate_embeddings(file_paths):
    '''
    Calculates the embeddings for the photos in the given relative file paths.
    '''
    embeddings = model.encode(
        [Image.open(os.path.join(root_dir, file_path)) for file_path in file_paths],
        batch_size=ENCODE_BATCH_SIZE,
        convert_to_tensor=True,
        show_progress_bar=False)
    return zip(file_paths, embeddings)

def upload_embeddings(embeddings):
    '''
    Uploads embeddings for relative file paths to the indexing server.
    '''
    url = target_base_url.strip('/') + '/v1/index'
    for (path, vector) in embeddings:
        body = {
            'items': [
                {
                    'path': path,
                    'v': vector.tolist(),
                }
            ]
        }
        response = requests.post(url, json=body)
        if response.status_code != 200:
            print(f'Index error: got status {response.status_code} for file "{path}"')
            return False
    return True

# Figure out which photos to index. That is the set of photos that exist, minus
# the set of photos that are already indexed (i.e. the photos from the checkpoint
# file).
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
    embeddings = calculate_embeddings(chunks[i])
    if upload_embeddings(embeddings):
        # Write to the checkpoint file so we know not to do the same photos again.
        checkpoint(np.asarray(chunks[i]))
    else:
        print(f"Failed to index some photos. paths: {chunks[i]}")
