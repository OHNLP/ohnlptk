'''
The Web module for the frontend
'''

from flask import Flask, request, session, g, redirect, url_for, abort, \
     render_template, flash

# Create our little application :)
app = Flask(
    __name__,
    static_folder='docs/static'
)

# Read config
app.config.from_pyfile('config.py')

# Set for jinja template engine
app.jinja_env.variable_start_string = '[['
app.jinja_env.variable_end_string = ']]'


# routers
@app.route('/')
@app.route('/index.html')
def index():
    return render_template('index.html')


@app.route('/ie_editor')
@app.route('/ie_editor.html')
def ie_editor():
    return render_template('ie_editor.html')


@app.route('/dt_builder')
@app.route('/dt_builder.html')
def dt_builder():
    return render_template('dt_builder.html')


if __name__=='__main__':
    app.run(port=app.config['DEV_PORT'])