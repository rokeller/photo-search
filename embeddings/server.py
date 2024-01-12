from bottle import Bottle, run, request, response
from sentence_transformers import SentenceTransformer

app = Bottle()
print('Loading multilingual model ...')
model = SentenceTransformer('.models/clip-ViT-B-32-multilingual-v1')
print('Model loaded.')

@app.post('/v1/embed')
def embed():
    query = request.forms.get('query')
    if not query:
        response.status = 400
        return { 'error': 'query must be specified' }

    embedding = model.encode([query])[0].tolist()
    resp_json = {'v': embedding}
    return resp_json

print('Starting server ...')
run(app, host='0.0.0.0', port=8082)
print('Server stopped.')
