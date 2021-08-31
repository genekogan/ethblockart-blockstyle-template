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

let DEFAULT_SIZE = 500;
const CustomStyle = ({
  block,
  canvasRef,
  attributesRef,
  width,
  height,
  handleResize,
  luminance = 0.75,
  opacity = 0.25
  // fill_color = '#000000',
  // background = '#ffffff'
}) => {
  const shuffleBag = useRef();
  const hoistedValue = useRef();

  const { hash } = block;

  // setup() initializes p5 and the canvas element, can be mostly ignored in our case (check draw())
  const setup = (p5, canvasParentRef) => {
    // Keep reference of canvas element for snapshots
    p5.createCanvas(width, height).parent(canvasParentRef);
    canvasRef.current = p5;

    attributesRef.current = () => {
      return {
        // This is called when the final image is generated, when creator opens the Mint NFT modal.
        // should return an object structured following opensea/enjin metadata spec for attributes/properties
        // https://docs.opensea.io/docs/metadata-standards
        // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1155.md#erc-1155-metadata-uri-json-schema

        attributes: [
          {
            display_type: 'number',
            trait_type: 'Vertices',
            value: hoistedValue.current, // using the hoisted value from within the draw() method, stored in the ref.
          }
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

    
    // reset shuffle bag
    let seed = parseInt(hash.slice(0, 16), 16);
    shuffleBag.current = new MersenneTwister(seed);
    // let objs = block.transactions.map((t) => {
    //   let seed = parseInt(t.hash.slice(0, 16), 16);
    //   return {
    //     y: shuffleBag.current.random(),
    //     x: shuffleBag.current.random(),
    //     radius: seed / 1000000000000000,
    //   };
    // });

    
    


    // create star
    let n, s, p;
    n = parseInt(5 + 16 * shuffleBag.current.random());
    do {
      s = [ 
        parseInt(1 + (n-1) * shuffleBag.current.random()),
        parseInt(1 + (n-1) * shuffleBag.current.random()), 
        parseInt(1 + (n-1) * shuffleBag.current.random())
      ];
    } 
    while (n % s[2] === 0);

    hoistedValue.current = n;

    p = [];
    for (var i = 0; i < n; i++) {
      var ang = p5.lerp(0, p5.TWO_PI, i / n);
      p.push({
        x: 0.333 * width * p5.cos(ang),
        y: 0.333 * height * p5.sin(ang)
      });
    }  
    
    var strokeHue = parseInt(360 * shuffleBag.current.random());
    var strokeSaturation = parseInt(90 + 10 * shuffleBag.current.random());
    var strokeBrightness = parseInt(90 + 10 * shuffleBag.current.random());
    var strokeAlpha = 0.85 + 0.13 * shuffleBag.current.random();

    var fillHue = parseInt(360 * shuffleBag.current.random());
    var fillSaturation = parseInt(60 + 40 * shuffleBag.current.random());
    var fillBrightness = parseInt(60 + 40 * shuffleBag.current.random());
    var fillAlpha = 0.05 + 0.15 * shuffleBag.current.random();

    p5.colorMode(p5.HSB, 360, 100, 100, 1);    

    p5.background(0); 
    var rads = Math.ceil((height**2 + width**2) ** 0.5);
    for (var r=rads; r>0; r-=5) {
      p5.fill(fillHue, fillSaturation, p5.lerp(0.33*fillBrightness, 0, r/rads));
      p5.noStroke();
      p5.ellipse(width/2, height/2, r, r);
    }

    var thickness = p5.map(luminance, 0.0, 1.0, 0.1, 1.0);

    for (var k=0; k<8; k++) {
      if (k < 5) {
        p5.noFill();
        p5.stroke(strokeHue, strokeSaturation, strokeBrightness, strokeAlpha * 0.1 * (k+1));
        p5.strokeWeight((7.0-k) * thickness);
      }
      else if (k == 5) {
        p5.noStroke();
        p5.fill(fillHue, fillSaturation, fillBrightness, fillAlpha * opacity);
      }
      else if (k == 6) {
        p5.noFill();
        p5.stroke(strokeHue, strokeSaturation, strokeBrightness, strokeAlpha*0.555);
        p5.strokeWeight(2.0  * thickness);
      }
      else if (k == 7) {
        p5.noFill();
        p5.stroke(strokeHue, strokeSaturation, strokeBrightness, strokeAlpha);
        p5.strokeWeight(1.0 * thickness);
      }

      p5.push();
      p5.translate(width/2, height/2);
      var i1 = 0;
      do {
        var i2 = (i1 + s[0]) % n;
        var i3 = (i1 + s[1]) % n;
        var i4 = (i1 + s[2]) % n;
        p5.beginShape();
          p5.curveVertex(p[i1].x, p[i1].y);
          p5.curveVertex(p[i2].x, p[i2].y);
          p5.curveVertex(p[i3].x, p[i3].y);
          p5.curveVertex(p[i4].x, p[i4].y);
        p5.endShape(p5.CLOSE);
        if (k>6) {
          p5.bezier(p[i1].x, p[i1].y, p[i2].x, p[i2].y, p[i3].x, p[i3].y, p[i4].x, p[i4].y);
        }
        i1 = i3;
      } 
      while (i1 !== 0); 

      p5.pop();
    }

  };

  return <Sketch setup={setup} draw={draw} windowResized={handleResize} />;
};

export default CustomStyle;

const styleMetadata = {
  name: 'Stars',
  description: 'Everyone learns how to make 5-vertex stars in grade school, but stars come in all shapes and sizes. These stars experiment with number of vertices, skips, beziers, and other effects.',
  image: '',
  creator_name: 'Gene Kogan',
  options: {
    luminance: 0.4,
    opacity: 0.1
    // fill_color: '#000000',
    // background: '#ffffff'
  },
};

export { styleMetadata };
