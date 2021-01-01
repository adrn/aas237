// If we want to buffer playback: http://jsfiddle.net/ikerr/qzny3sg1/

import * as THREE from '../js/three/three.module.js';
import { GUI } from '../js/three/examples/jsm/libs/dat.gui.module.js';
import Stats from '../js/three/examples/jsm/libs/stats.module.js';
import { TrackballControls } from '../js/three/examples/jsm/controls/TrackballControls.js';

let data_file = 'data/jason-sgr-100000.json';

let camera, scene, renderer, controls, stats, gui;
let windowHalfX, windowHalfY;
let data, particles;
var config = {
    rate: 10,
    frame: null,
    start_time: null,
    _running: true,
    stop: function() {
        this._running = false;
    },
    start: function() {
        if (this._running == true)
            return;
        this._running = true;
        this.start_time = Date.now();
    },
    reset: function() {
        // defaults:
        this.frame = 0;
        this.start_time = Date.now();
    }
}
config.reset();
let container = document.getElementById('container');
let progress_container = document.getElementById('progress');

var progress = new ProgressBar.Circle(progress_container, {
    color: '#aaa',
    // This has to be the same size as the maximum width to
    // prevent clipping
    strokeWidth: 4,
    trailWidth: 2,
    //easing: 'easeInOut',
    //duration: 2000,
    text: {
      autoStyleContainer: false
    },
    from: { color: '#333', width: 2 },
    to: { color: '#31a354', width: 4 },
    // Set default step function for all animate calls
    step: function(state, circle) {
      circle.path.setAttribute('stroke', state.color);
      circle.path.setAttribute('stroke-width', state.width);

      var value = Math.round(circle.value() * 100);
      if (value === 0) {
        circle.setText('');
      } else {
        circle.setText(value);
      }
    }
});
progress.text.style.fontSize = '22pt';
// progress.animate(1.0);  // Number from 0.0 to 1.0

$(document).ready(function() {

    $.ajax({
        method: 'GET',
        url: data_file,
        dataType: 'json',
        success: function(this_data) {
            console.log('done downloading');
            $(progress_container).hide();
            data = this_data['xyz'];
            init(data[0]);
            animate();
        },
        error: function() { },
        progress: function(e) {
            //make sure we can compute the length
            if(e.lengthComputable) {
                //calculate the percentage loaded
                var pct = (e.loaded / e.total) * 100;
                progress.set((e.loaded / e.total));

                //log percentage loaded
                // console.log(pct);
            }
            //this usually happens when Content-Length isn't set
            else {
                console.warn('Content Length not reported!');
            }
        }
    });

});

function init(data) {
    var aspect = window.innerWidth / window.innerHeight;

    // Setup the camera
    camera = new THREE.PerspectiveCamera(75, aspect, 10, -10);
    //camera.position.x = 100;
    camera.position.y = 50;
    camera.up = new THREE.Vector3(0, 0, 1);

    // Define the renderer
    renderer = new THREE.WebGLRenderer({
        // antialias: true,
        alpha : true
    });
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild(renderer.domElement);

    // Add an FPS stats window
    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild(stats.domElement);

    // Add a GUI with some controls
    gui = new GUI()
    const anim_folder = gui.addFolder("Animation")
    anim_folder.add(config, 'rate', 0.1, 60, 0.1);
    anim_folder.add(config, 'stop');
    anim_folder.add(config, 'start');
    anim_folder.add(config, 'reset');
    anim_folder.open()

    // Set up the particle texture:
    const texture = new THREE.Texture( generateTexture( ) );
    texture.needsUpdate = true; // important

    // Set up the scene
    scene = new THREE.Scene();

    const geometry = new THREE.BufferGeometry();

    var k = 0;  // initial timestep
    var d = new Float32Array(data[k].length * 3);
    for (let i=0; i < data[k].length; i++) {
        d[3*i + 0] = data[k][i][0];
        d[3*i + 1] = data[k][i][1];
        d[3*i + 2] = data[k][i][2];
    }
    console.log('done prepping data', d);

    geometry.setAttribute('position',
                          new THREE.BufferAttribute(d, 3));
    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        map: texture,
        size: 0.1,
        opacity: 0.2,
        blending: THREE.AdditiveBlending, // required
        depthTest: false, // required
        transparent: true
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // window.addEventListener('resize', onWindowResize, false);

    createControls(camera);
}

function generateTexture( ) {
    // draw a circle in the center of the canvas
    var size = 128;

    // create canvas
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    // get context
    var context = canvas.getContext('2d');

    // draw circle
    var centerX = size / 2;
    var centerY = size / 2;
    var radius = size / 2;

    context.beginPath();
    context.arc( centerX, centerY, radius, 0, 2 * Math.PI, false );
    context.fillStyle = "#FFFFFF";
    context.fill();

    return canvas;
}

function createControls(camera) {

    controls = new TrackballControls( camera, renderer.domElement );

    controls.rotateSpeed = 2.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;

    controls.keys = [ 65, 83, 68 ];

    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;

}

function render() {
    // do the actual rendering
    const secs_elapsed = (Date.now() - config.start_time) / 1000.;
    var this_frame = config.frame + parseInt(secs_elapsed * config.rate);

    // console.log(config, this_frame);

    if (this_frame == config.frame)
        return true;
    else if (this_frame >= data.length)
        return false;
    else if (config._running != true)
        return false;

    var k = this_frame;  // timestep

    var geometry = particles.geometry;

    var d = new Float32Array(data[k].length * 3);
    for (let i=0; i < data[k].length; i++) {
        d[3*i + 0] = data[k][i][0];
        d[3*i + 1] = data[k][i][1];
        d[3*i + 2] = data[k][i][2];
    }
    geometry.setAttribute('position',
                            new THREE.BufferAttribute(d, 3));

    config.frame = this_frame;
    config.start_time = Date.now();

    return true;
}

function animate() {
    // recursive animation function
    var myReq = requestAnimationFrame(animate);

    controls.update();
    stats.update();

    var anim_state = render();

    camera.lookAt(scene.position);
    renderer.render(scene, camera);
}