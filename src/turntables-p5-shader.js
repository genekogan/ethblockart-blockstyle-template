import React, { useRef } from 'react';
import Sketch from 'react-p5';
import MersenneTwister from 'mersenne-twister';




/*
Create your Custom style to be turned into a EthBlock.art Mother NFT

Basic rules:
 - use a minimum of 1 and a maximum of 4 "modifiers", modifiers are values between 0 and 1,
 - use a minimum of 1 and a maximum of 3 colors, the color "background" will be set at the canvas root
 - Use the block as source of entropy, no Math.random() allowed!
 - You can use a "shuffle bag" using data from the block as seed, a MersenneTwister library is provided

 Arguments:
  - block: the blockData, in this example template you are given 3 different blocks to experiment with variations, check App.js to learn more
  - mod[1-3]: template modifier arguments with arbitrary defaults to get your started
  - color: template color argument with arbitrary default to get you started

Getting started:
 - Write p5.js code, comsuming the block data and modifier arguments,
   make it cool and use no random() internally, component must be pure, output deterministic
 - Customize the list of arguments as you wish, given the rules listed below
 - Provide a set of initial /default values for the implemented arguments, your preset.
 - Think about easter eggs / rare attributes, display something different every 100 blocks? display something unique with 1% chance?

 - check out p5.js documentation for examples!
*/

let pg;
let shady;
let rects;


let vert_shader = 
  'attribute vec3 aPosition;' +
  'attribute vec2 aTexCoord;' +
  'varying vec2 vTexCoord;' +
  'void main() {' +
  '  vTexCoord = aTexCoord;' +
  '  vec4 positionVec4 = vec4(aPosition, 1.0);' +
  '  positionVec4.xy = positionVec4.xy * 2.0 - 1.0;' +
  '  gl_Position = positionVec4;' +
  '}' 

let frag_shader = 
  'precision mediump float;' +
  'varying vec2 vTexCoord;' +
  'uniform sampler2D tex0;' +
  'void main() {' +
  '  vec2 p = -1.0 + 2.0 * vTexCoord.xy;' +
  '  float a = atan(p.y,p.x);' +
  '  float r = sqrt(dot(p,p));' +
  '  vec2 uv;' +
  '  uv.x = (a + 3.14159265359)/6.28318530718;' +
  '  uv.y = r / sqrt(2.0);' +
  '  vec3 col = texture2D(tex0, uv).rgb;' +
  '  gl_FragColor = vec4(col, 1.0);' +
  '}'


let DEFAULT_SIZE = 500;
const CustomStyle = ({
  block,
  canvasRef,
  attributesRef,
  width,
  height,
  handleResize,
  mod1 = 0.5, // Example: replace any number in the code with mod1, mod2, or color values
  mod2 = 0.5
}) => {
  const shuffleBag = useRef();
  const hoistedValue = useRef();  
  const { hash } = block;

  function Rect(x, y, w, h, col, col2) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.col = col;
    this.col2 = col2;
  }
  
  const preload = (p5) => {
    shady = p5.loadShader('base.vert', 'wrap.frag');
  }
  
  // setup() initializes p5 and the canvas element, can be mostly ignored in our case (check draw())
  const setup = (p5, canvasParentRef) => {
    canvasRef.current = p5;
  
    // Keep reference of canvas element for snapshots
    p5.createCanvas(width, height, p5.WEBGL).parent(canvasParentRef);
    p5.colorMode(p5.HSB, 360, 100, 100, 1)
    pg = p5.createGraphics(width, height, p5.P2D);    
    shady = p5.createShader(vert_shader, frag_shader);
      
    attributesRef.current = () => {
      return {
        // This is called when the final image is generated, when creator opens the Mint NFT modal.
        // should return an object structured following opensea/enjin metadata spec for attributes/properties
        // https://docs.opensea.io/docs/metadata-standards
        // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1155.md#erc-1155-metadata-uri-json-schema

        attributes: [
          {
            display_type: 'number',
            trait_type: 'your trait here number',
            value: hoistedValue.current, // using the hoisted value from within the draw() method, stored in the ref.
          },
          {
            trait_type: 'your trait here text',
            value: 'replace me',
          },
        ],
      };
    };
  };

  // draw() is called right after setup and in a loop
  // disabling the loop prevents controls from working correctly
  // code must be deterministic so every loop instance results in the same output

  // Basic example of a drawing something using:
  // a) the block hash as initial seed (shuffleBag)
  // b) individual transactions in a block (seed)
  // c) custom parameters creators can customize (mod1, color1)
  // d) final drawing reacting to screen resizing (M)
  const draw = (p5) => {
    let WIDTH = width;
    let HEIGHT = height;
    let DIM = Math.min(WIDTH, HEIGHT);
    let M = DIM / DEFAULT_SIZE;

    if (pg.width != width || pg.height != height) {
      pg = p5.createGraphics(width, height, p5.P2D);    
    }
    
    let seed = parseInt(hash.slice(0, 16), 16);
    shuffleBag.current = new MersenneTwister(seed);

    function perturbColor(col, h, s, b) {
      var h2 = p5.floor(p5.hue(col) + p5.map(shuffleBag.current.random(), 0, 1, -h, h) + 360) % 360;
      var s2 = p5.floor(p5.saturation(col) + p5.map(shuffleBag.current.random(), 0, 1, -s, s) + 100) % 100;
      var b2 = p5.floor(p5.brightness(col) + p5.map(shuffleBag.current.random(), 0, 1, -b, b) + 100) % 100;
      return p5.color(h2, s2, b2);
    }
  
    function subdivide(rects, n, x, y, w, h, col, thresh) {
      if (n==0) {
        var col2 = p5.color(p5.hue(col), p5.saturation(col), p5.brightness(col) * shuffleBag.current.random(), 0.5 * shuffleBag.current.random());
        rects.push(new Rect(x, y, w, h, col, col2));
      } 
      else {
        var newcol1 = perturbColor(col, n, n*2, n*3);
        var newcol2 = perturbColor(col, n, n*2, n*3);  
        //var t = p5.random(1);
        var t = Math.pow(shuffleBag.current.random(), 0.5+mod2);
        var horiz = shuffleBag.current.random() > thresh ? true : false;
        if (horiz) {
          subdivide(rects, n-1, x, y, w, h*t, newcol1, thresh);
          subdivide(rects, n-1, x, y+h*t, w, h*(1-t), newcol2, thresh);
        } else {
          subdivide(rects, n-1, x, y, w*t, h, newcol1, thresh);
          subdivide(rects, n-1, x+w*t, y, w*(1-t), h, newcol2, thresh);  
        }      
      }
    }
  
    rects = [];
    
    var base = p5.color(
      p5.map((shuffleBag.current.random() + 0.25 * mod1) % 1.0, 0, 1, 0, 360),
      p5.map(shuffleBag.current.random(), 0, 1, 60, 100),
      p5.map(shuffleBag.current.random(), 0, 1, 60, 100)
    );

    var N = 9 + Math.floor(3 * shuffleBag.current.random());
    var thresh = 0.1 + 0.8 * shuffleBag.current.random();
    subdivide(rects, N, 0, 0, width, height, base, thresh);

    pg.clear();
    pg.background(0);
    pg.colorMode(p5.HSB, 360, 100, 100, 1);
    for (var r=0; r<rects.length; r++) {
      pg.fill(rects[r].col);
      pg.noStroke();
      // pg.stroke(rects[r].col2);
      // p5.strokeWeight(0.25);
      pg.rect(rects[r].x, rects[r].y, rects[r].w, rects[r].h);
    }
    p5.shader(shady);
    shady.setUniform('tex0', pg);
    p5.noStroke();
    p5.rect(0, 0, width, height);
    //p5.image(pg, -width/2, -height/2, width, height);

    // example assignment of hoisted value to be used as NFT attribute later
    hoistedValue.current = 42;
  };

  return <Sketch setup={setup} draw={draw} preload={preload} windowResized={handleResize} />;
};

export default CustomStyle;

const styleMetadata = {
  name: '',
  description: '',
  image: '',
  creator_name: '',
  options: {
    mod1: 0.5,
    mod2: 0.5
  },
};

export { styleMetadata };
