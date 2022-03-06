from bottle import get, run, template, static_file


with open('game.html', 'r') as f:
	index_page_html = f.read()

@get('/static/<filename>')
def server_static(filename):
	return static_file(filename, root='static/')

@get('/')
def index():
	return index_page_html

run(port=8080)