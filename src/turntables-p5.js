import React, { useRef } from 'react';
import Sketch from 'react-p5';
import MersenneTwister from 'mersenne-twister';
import { randFloatSpread } from 'three/src/math/MathUtils';


let shard;

let recursionDampenGradient;
let numRecursions;
let gradientRate;

let decayTriggerProb;
let radialThresh;
let hueVary;
let satVary;
let brightVary;
let ang0;
let baseColor;  

let grd1R;
let grd2R;
let hueMargin;
let satMargin;
let brightMargin;
let grdInverted;
let decayTrigger;
    
let minArea;
let minR;
let minA;
let maxR;
let maxA;
let maxArea;
let minAreaGradient;
let maxAreaGradient;

let currentSeed;
let T=0;


let DEFAULT_SIZE = 500;
const CustomStyle = ({
  block,
  canvasRef,
  attributesRef,
  width,
  height,
  handleResize,
  mod1 = 0.5, // Example: replace any number in the code with mod1, mod2, or color values
  mod2 = 0.075
}) => {
  const shuffleBag = useRef();
  const hoistedValue = useRef();
  const hoistedValue2 = useRef();

  const { hash } = block;

  function rand(val1, val2) {
    return val1 + (val2 - val1) * shuffleBag.current.random();
  }

  function dice(prob) {
    return shuffleBag.current.random() < prob;
  }

  function map(input, from1, to1, from2, to2) {
    return from2 + (to2-from2) * (input-from1) / (to1-from1);
  }

  
  // =========== SETUP =========== //
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
            trait_type: 'Number of recursions',
            value: hoistedValue.current, // using the hoisted value from within the draw() method, stored in the ref.
          },
          {
            trait_type: 'subdivision',
            value: hoistedValue2.current,
          },
        ],
      };
    };
  };

  const draw = (p5) => {

    function perturbColor(col, h, s, b) {
      var h2 = p5.floor(p5.hue(col) + rand(-h, h) + 360) % 360;
      var s2 = p5.floor(p5.saturation(col) + rand(-s, s) + 100) % 100;
      var b2 = p5.floor(p5.brightness(col) + rand(-b, b) + 100) % 100;
      return p5.color(h2, s2, b2);
    }

    function colorToHTML(col, alpha) {
      if (alpha === undefined) {
        return 'hsl('+Math.floor(p5.hue(col))+','+Math.floor(p5.saturation(col))+'%,'+Math.floor(p5.brightness(col))+'%)';
      } else {
        return 'hsla('+Math.floor(p5.hue(col))+','+Math.floor(p5.saturation(col))+'%,'+Math.floor(p5.brightness(col))+'%, '+alpha+')';
      }
    }

    // =========== SEGMENT ============ //
    function drawSegment(s, rad1, rad2, ang1, ang2, fill, stroke) {

      // offset
      if (!fill) {
        let dr = (rad2-rad1) * s.dR;
        rad1 = Math.max(0, rad1 + dr);
        rad2 = Math.max(0, rad2 + dr);
        let da = (ang2-ang1) * s.dA;
        ang1 = ang1 + s.dA;
        ang2 = ang2 + s.dA;
      }

      var area = (ang2 - ang1) * (rad2*rad2 - rad1*rad1) * areaCoeff;
      if (area < minArea || (rad2-rad1) < minR || (ang2-ang1) < minA) {
        return;
      }

      let areaAlpha = p5.constrain(p5.map(area, minArea, maxArea, 0, 1), 0, 1);
      let radAlpha = p5.constrain(p5.map(rad2-rad1, minR, maxR, 0, 1), 0, 1);
      let angAlpha = p5.constrain(p5.map(ang2-ang1, minA, maxA, 0, 1), 0, 1);
      let fillAlpha = Math.min(Math.min(areaAlpha, radAlpha), angAlpha);      
      let strokeAlpha = p5.constrain(p5.map(area, minArea, 20 * maxArea, 0, 1), 0.0, 1);
      let lineWidth = p5.constrain(p5.map(area, minArea, 0.05, R/2700, R/1000 ), 0, R/800);
      
      let amtGradient = 0.0;
      if (s.gradient) {
        amtGradient = p5.constrain((area - minAreaGradient)/(maxAreaGradient - minAreaGradient), 0, 1)
      }

      if (s.gradient && amtGradient > 0) {
        var colG = p5.color([
          p5.lerp(p5.hue(s.col), p5.hue(s.col2), amtGradient),
          p5.lerp(p5.saturation(s.col), p5.saturation(s.col2), amtGradient),
          p5.lerp(p5.brightness(s.col), p5.brightness(s.col2), amtGradient)
        ])
        var grd = p5.drawingContext.createRadialGradient(width/2, height/2, rad1, width/2, height/2, rad2);
        grd.addColorStop(0, colorToHTML(s.col, fillAlpha * (s.translucent ? 1.0 : 0.66) ));
        grd.addColorStop(1, colorToHTML(colG, fillAlpha * (s.translucent ? 1.0 : 0.66) ));  
        p5.drawingContext.fillStyle = grd;
      }
      else {
        p5.drawingContext.fillStyle = colorToHTML(s.col, fillAlpha * (s.translucent ? 1.0 : 0.5));
      }
      p5.drawingContext.strokeStyle = colorToHTML(s.col2, strokeAlpha);      
      p5.drawingContext.lineWidth = lineWidth;
      p5.drawingContext.beginPath();
      p5.drawingContext.arc(cx, cy, rad2, ang1+ang0, ang2+ang0, false);
      p5.drawingContext.lineTo(cx + rad1 * Math.cos(ang2+ang0), cy + rad1 * Math.sin(ang2+ang0));
      p5.drawingContext.arc(cx, cy, rad1, ang2+ang0, ang1+ang0, true); 
      p5.drawingContext.lineTo(cx + rad2 * Math.cos(ang1+ang0), cy + rad2 * Math.sin(ang1+ang0));
      if (fill) {
        p5.drawingContext.fill();
      }
      if (stroke) {        
       p5.drawingContext.stroke();  
      }
      p5.drawingContext.closePath();
    }

    function Shard(col, gen, radialThresh, gradientRate, hueVary, satVary, brightVary, decayTrigger) {
      this.gen = gen;
      this.col = col;    
      this.decayTrigger = decayTrigger;
      this.translucent = dice(0.5);
      let hueMargin = rand(-5, 5);
      let satMargin = rand(0, 15);
      let brightMargin = rand(-20, 20);
      
      this.col2 = p5.color([
        p5.constrain(p5.hue(col) + hueMargin, 0, 360),
        p5.constrain(p5.saturation(col) + satMargin, 0, 100),
        p5.constrain(p5.brightness(col) + brightMargin, 0, 100)
      ]);
      if (dice(0.5)) {
        let colTemp = this.col;
        this.col = this.col2;
        this.col2 = colTemp;
      }
  
      this.gradient = dice(gradientRate);

      this.mindR = -0.1;
      this.maxdR = 0.1;
      this.mindA = -0.1;
      this.maxdA = 0.1;
  
      this.off1 = rand(-100, 100);
      this.off2 = rand(-100, 100);
      this.off3 = rand(-100, 100);

      this.speed = dice(0.5) ? 1.0 : -1.0; 

      this.radial = dice(radialThresh);
  
      if (this.gen > 0) {
        let decayTrigger_ = this.decayTrigger || dice(decayTriggerProb);
        let col1 = perturbColor(this.col, this.gen*hueVary, this.gen*satVary, this.gen*brightVary);
        let col2 = perturbColor(this.col, this.gen*hueVary, this.gen*satVary, this.gen*brightVary);
        this.child1 = new Shard(col1, this.gen-1, radialThresh, gradientRate, hueVary, satVary, brightVary, decayTrigger_);
        this.child2 = new Shard(col2, this.gen-1, radialThresh, gradientRate, hueVary, satVary, brightVary, decayTrigger_);
      }
      
      this.update = function(t, mod1) {
        this.mint = 0.40 * mod1;
        this.maxt = 1.0 - 0.4 * mod1;

        this.t = map(Math.sin(this.off1 + this.speed * t), -1, 1, this.mint, this.maxt);
        this.dR = map(Math.sin(this.off2 + this.speed * t), -1, 1, this.mindR, this.maxdR);
        this.dA = map(Math.sin(this.off3 + this.speed * t), -1, 1, this.mindA, this.maxdA);
        if (this.gen > 0) {
          this.child1.update(t, mod1);
          this.child2.update(t, mod1);
        }
      }
    }  

    // =========== SHARD ============ //
    function drawShard(s, rad1, rad2, ang1, ang2, fill, stroke) {
  
      if (s.gen == 0) {
        drawSegment(s, 
          rad1, rad2, ang1+ang0, ang2+ang0, 
          s.decayTrigger ? !fill : fill, 
          s.decayTrigger ? !stroke: stroke
        );
      } 
      else {
        if (s.radial) {
          drawShard(s.child1, rad1, rad1 + s.t * (rad2 - rad1) + dR, ang1, ang2, fill, stroke);
          drawShard(s.child2, rad1 + s.t * (rad2 - rad1), rad2, ang1, ang2, fill, stroke);
        } 
        else {
          drawShard(s.child1, rad1, rad2, ang1, ang1 + s.t * (ang2 - ang1) + dA, fill, stroke);
          drawShard(s.child2, rad1, rad2, ang1 + s.t * (ang2 - ang1), ang2, fill, stroke);  
        }
      }
    }

    let R = Math.sqrt(width * width + height * height);
    let cx = width/2;
    let cy = height/2;
    let dR = 0.5;
    let dA = 0.002;
    let areaCoeff = 1.0 / (R * R);

    // set to HSB
    p5.colorMode(p5.HSB, 360, 100, 100);
    
    let seed = parseInt(hash.slice(0, 16), 16);
    shuffleBag.current = new MersenneTwister(seed);
    
    if (currentSeed != seed) {
      currentSeed = seed;
      T = 0;

      radialThresh = rand(0.35, 0.9);      
      var radialDice = rand(0, 1);
      if (radialDice < 0.01) {
        radialThresh = 0.0;
      } else if (radialDice < 0.02) {
        radialThresh = 1.0;
      } 

      var numRecursionsDice = rand(0, 1);
      if (numRecursionsDice > 0.9 && radialThresh < 0.7 && radialThresh > 0.3) {
        numRecursions = 11;
        recursionDampenGradient = 0.33;
      } else if (numRecursionsDice > 0.5) {
        numRecursions = 10;
        recursionDampenGradient = 0.66;
      } else {
        numRecursions = 9;
        recursionDampenGradient = 1.0;
      }

      gradientRate = rand(0.5, 0.85);
      gradientRate *= recursionDampenGradient;

      decayTriggerProb = rand(0.135, 0.325);

      let minThreshMult = 0.0;
      if (numRecursions == 11){
        minThreshMult = 1.0;
      } else if (numRecursions == 10){
        minThreshMult = 0.4;
      } else {
        minThreshMult = 0.05;
      }
      
      minArea = 0.0002 * minThreshMult;
      minR = p5.map(radialThresh, 0, 1, 0.1, 3) * minThreshMult;
      minA = p5.map(radialThresh, 0, 1, 0.01, 0.1) * minThreshMult;
      maxArea = 2.5 * minArea;
      maxR = 2.0 * minR;
      maxA = 2.0 * minA;
      minAreaGradient = minArea;
      maxAreaGradient = maxArea;
      
      grd1R = rand(R/5, R/3);
      grd2R = rand(R/2, 2*R/3);
      hueMargin = rand(-25, 25);
      satMargin = rand(15, 35);
      brightMargin = rand(20, 40);
      grdInverted = dice(0.5);
      decayTrigger = dice(decayTriggerProb);    

      hueVary = 1; //rand(0.5, p5.map(numRecursions, 9, 12, 2, 1.5));
      satVary = 2; //rand(1.0, p5.map(numRecursions, 9, 12, 6, 4));
      brightVary = 3; //rand(1.5, p5.map(numRecursions, 9, 12, 10, 5));
      
      ang0 = rand(0, 2.0 * Math.PI);
      baseColor = p5.color([rand(0, 360), rand(40, 100), rand(30, 100)]);

      shard = new Shard(baseColor, numRecursions, radialThresh, gradientRate, hueVary, satVary, brightVary, decayTrigger);
    }

    var speed = p5.map(mod2 < 1e-3 ? 0 : mod2, 0, 1, 0, p5.map(mod1, 0.0, 1.0, 0.001, 0.022));
    T += speed;
    

    // console.log("update " +T + " "+p5.frameCount)
    shard.update(T, mod1);
    
    p5.colorMode(p5.HSB, 360, 100, 100);
    p5.background(baseColor);

    let grd = p5.drawingContext.createRadialGradient(width/2, height/2, grd1R, width/2, height/2, grd2R);

    let bg1 = baseColor;
    let bg2 = p5.color([
      (p5.hue(baseColor) + hueMargin) % 360,
      p5.saturation(baseColor) + (p5.saturation(baseColor) > 50? -1 : 1) * satMargin,
      p5.brightness(baseColor) + (p5.brightness(baseColor) > 50? -1 : 1) * brightMargin
    ])

    if (grdInverted) {
      grd.addColorStop(0, bg1);
      grd.addColorStop(1, bg2);
    } else {
      grd.addColorStop(0, bg2);
      grd.addColorStop(1, bg1);
    }
    p5.drawingContext.fillStyle = grd;
    p5.drawingContext.fillRect(0, 0, width, height);

    drawShard(shard, 
      0, R, 
      0, 2.0 * Math.PI, 
      false, true
    );

    // framerate
    // p5.stroke(0);
    // p5.fill(0);
    // p5.textSize(20);
    // if (radialThresh == 0.0) {
    //   p5.text("*", 100, 20);
    // } else if (radialThresh == 1.0) {
    //   p5.text("**", 100, 20);
    // }     
    // p5.text(Math.floor(p5.frameRate())+ " fps ("+numRecursions+")", 2, 20);


    // example assignment of hoisted value to be used as NFT attribute later
    hoistedValue.current = numRecursions;
    if (radialThresh == 1.0) {
      hoistedValue2.current = 'radial' ;
    } else if (radialThresh == 0.0) {
      hoistedValue2.current = 'angular';
    } else {
      hoistedValue2.current = 'mixed';
    }
    
  };

  return <Sketch setup={setup} draw={draw} windowResized={handleResize} />;
};

export default CustomStyle;

const styleMetadata = {
  name: 'Turntables',
  description: '',
  image: '',
  creator_name: '',
  options: {
    mod1: 0.5,
    mod2: 0.075
  },
};

export { styleMetadata };
