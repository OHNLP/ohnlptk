'''
The Web module for the frontend
'''
import os
import pathlib

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


def build():
    '''
    Build the static website
    '''
    with app.test_client() as client:
        with app.app_context():
            for url in [
                '/index.html',
                '/ie_editor.html']:
                make_page(
                    client, 
                    url, 
                    os.path.join(
                        pathlib.Path(__file__).parent.absolute(),
                        app.config['STATIC_PAGE_ROOT_PATH']
                    )
                )

    print('* done building static pages')


def make_page(client, url, path, param=None):
    '''
    Make static page from url
    '''
    rv = client.get(url)
    fn = os.path.join(
        path,
        url[1:]
    )
    # print(path, fn)
    with open(fn, 'w') as f:
        f.write(rv.data.decode('utf8'))
    
    print('* made static page %s' % (fn))


if __name__=='__main__':
    import argparse

    parser = argparse.ArgumentParser(description='COVID-19 Map Data Pipeline')

    # add paramters
    parser.add_argument("--mode", type=str, 
        choices=['build', 'run'], default='run',
        help="Which mode?")

    args = parser.parse_args()

    if args.mode == 'run':
        app.run(port=app.config['DEV_PORT'])
    elif args.mode == 'build':
        build()
    else:
        parser.print_usage()