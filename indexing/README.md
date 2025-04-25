# Indexing

## Run

```bash
docker container run --rm -it \
    -v $PWD/.models/clip-ViT-B-32/0_CLIPModel/:/.model:ro \
    -v /home/rogerk/Pictures:/photos:ro \
    rokeller/photo-search-indexing:v0.4.11-3-g1b6125a \
    -m /.model -p /photos
echo $?
```
