import React, { useEffect, useMemo, useRef } from 'react';
import { useThree, Canvas } from 'react-three-fiber';
import MersenneTwist from 'mersenne-twister';
import { TorusKnot } from '@react-three/drei';
import Color from 'color';

/*
Create your Custom style to be turned into a EthBlock.art BlockStyle NFT

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
 - Write canvas code, consuming the block data and modifier arguments,
   make it cool and use no random() internally, component must be pure, output deterministic
 - Customize the list of arguments as you wish, given the rules listed below
 - Provide a set of initial /default values for the implemented arguments, your preset.
 - Think about easter eggs / rare attributes, display something different every 100 blocks? display something unique with 1% chance?


*/

// Required style metadata
const styleMetadata = {
  name: '',
  description: '',
  image: '',
  creator_name: '',
  options: {
    mod1: 0.4,
    mod2: 0.1,
    mod3: 0.4,
    color1: '#fff000',
    background: '#000000',
  },
};

export { styleMetadata };

function rect(props) {
  const { ctx, x, y, width, height, color } = props;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
}

const Outer = React.memo(
  ({ canvasRef, block, width, height, mod1, mod2, background, ...props }) => {
    const shuffleBag = useRef();
    const hoistedValue = useRef();

    useEffect(() => {





      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const { hash } = block;
      const seed = parseInt(hash.slice(0, 16), 16);
      let frameCount = 0;
      shuffleBag.current = new MersenneTwist(seed);
      
      var shard;

      const cX = canvas.width/2;
      const cY = canvas.height/2;  
      const R = Math.sqrt(Math.pow(canvas.width, 2) + Math.pow(canvas.height, 2));
      const dR = 1.5/R;
      const dA = 0.001;
      var ang0 = 2.0 * Math.PI * shuffleBag.current.random();

      function drawSegment(rad1, rad2, ang1, ang2, clr) {
        ctx.beginPath();
        ctx.arc(cX, cY, rad2, ang1+ang0, ang2+ang0, false);
        ctx.arc(cX, cY, rad1, ang2+ang0, ang1+ang0, true);
        ctx.fillStyle = colorToHTMLColor(clr, 1.0);
        ctx.strokeStyle = colorToHTMLColor(clr, 1.0);
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();  
      }
      
      function map(input, from1, to1, from2, to2) {
        return from2 + (to2-from2) * (input-from1) / (to1-from1);
      }
      
      function perturbColor(col, h, s, b) {
        var h2 = (col[0] - h + 2*h*shuffleBag.current.random() + 360) % 360;
        var s2 = (col[1] - s + 2*s*shuffleBag.current.random() + 100) % 100;
        var b2 = (col[2] - b + 2*b*shuffleBag.current.random() + 100) % 100;
        return [h2, s2, b2];
      }
      
      function colorToHTMLColor(col, alpha) {
        return 'hsla('+Math.floor(col[0])+','+Math.floor(col[1])+'%,'+Math.floor(col[2])+'%, '+alpha+')';
      }

      function sample(array) {
        return array[Math.floor(Math.random() * array.length)];
      }     
      
      function Shard(col, gen) {
        this.col = col;
        // this.col = [360.0 * Math.random(), 1000.0 * Math.random(), 100.0 * Math.random()];
        this.gen = gen;
        this.mint = 0.4 * shuffleBag.current.random();
        this.maxt = this.mint + (1.0-this.mint) * shuffleBag.current.random();
        
        if (this.gen > 0) {
          this.radial = shuffleBag.current.random() > 0.5 ? true : false;
          this.off = 100.0 * shuffleBag.current.random();
          this.speed = sample([0.005, 0.01, 0.02]); //0.005; //random(0.02, 0.05);
          
          let col1 = perturbColor(this.col, this.gen, this.gen*2, this.gen*3);
          let col2 = perturbColor(this.col, this.gen, this.gen*2, this.gen*3);
      
          this.child1 = new Shard(col1, this.gen-1);
          this.child2 = new Shard(col2, this.gen-1);
        }
        
        this.update = function() {
          //this.t = map(Math.sin(this.off + this.speed * frameCount), -1, 1, this.mint, this.maxt);
          // this.t = map((this.off + this.speed * frameCount) % 5.0, 0, 5.0, this.mint, this.maxt);
          this.t = map(Math.sin(this.off + this.speed * frameCount), -1, 1, this.mint, this.maxt);

          if (this.gen > 0) {
            this.child1.update();
            this.child2.update();
          }
        }

        
      
        this.draw = function(rad1, rad2, ang1, ang2) {
          if (this.gen == 0) {
            drawSegment(rad1, rad2, ang1, ang2, this.col);
          } 
          else {
            if (this.radial) {
              this.child1.draw(rad1, rad1 + this.t * (rad2 - rad1) + dR, ang1, ang2);
              this.child2.draw(rad1 + this.t * (rad2 - rad1), rad2, ang1, ang2);
            } 
            else {
              this.child1.draw(rad1, rad2, ang1, ang1 + this.t * (ang2 - ang1) + dA);
              this.child2.draw(rad1, rad2, ang1 + this.t * (ang2 - ang1), ang2);  
            }
          }
        }
      }


      
      function refresh() {
        
        var baseColor = [360*shuffleBag.current.random(), 60+40*shuffleBag.current.random(), 60+40*shuffleBag.current.random()];
        shard = new Shard(baseColor, 10);
        
      }
      
      
      function draw() {
        
        frameCount += 1;
        shard.update();
        shard.draw(0, R, 0, 2.0 * Math.PI);
        window.requestAnimationFrame(draw);
      }

      
      refresh();
      window.requestAnimationFrame(draw);


      

      hoistedValue.current = 42;


    }, [canvasRef, block, mod1, mod2]);

    return (
      <canvas
        width={width}
        height={height}
        style={{ width: '100%', height: '100%' }}
        ref={canvasRef}
        {...props}
      />
    );
  }
);

export default Outer;

