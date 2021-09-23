import React, { useRef } from 'react';
import Sketch from 'react-p5';
import MersenneTwister from 'mersenne-twister';
import { randFloatSpread } from 'three/src/math/MathUtils';



let DEFAULT_SIZE = 500;
const CustomStyle = ({
  block,
  canvasRef,
  attributesRef,
  width,
  height,
  handleResize,
  mod1 = 0.5, // Example: replace any number in the code with mod1, mod2, or color values
  mod2 = 0.0
}) => {
  const shuffleBag = useRef();
  const hoistedValue = useRef();

  const { hash } = block;

  function rand(val1, val2) {
    return val1 + (val2 - val1) * shuffleBag.current.random();
  }

  function dice(prob) {
    return shuffleBag.current.random() < prob;
  }

  function colorToHTML(col, alpha) {
    if (alpha === undefined) {
      return 'hsl('+Math.floor(col[0])+','+Math.floor(col[1])+'%,'+Math.floor(col[2])+'%)';
    } else {
      return 'hsla('+Math.floor(col[0])+','+Math.floor(col[1])+'%,'+Math.floor(col[2])+'%, '+alpha+')';
    }
  }

  function complementColor(col) {
    return [(col[0] + 180) % 360, col[2], col[1]]
  }

  function perturbColor(col, h, s, b) {
    var h2 = (col[0] + rand(-h, h) + 360) % 360;
    var s2 = (col[1] + rand(-s, s) + 100) % 100;
    var b2 = (col[2] + rand(-b, b) + 100) % 100;
    return [h2, s2, b2];
  }

  function map(input, from1, to1, from2, to2) {
    return from2 + (to2-from2) * (input-from1) / (to1-from1);
  }

  function Shard(col, gen, radialThresh, gradientRate, hueVary, satVary, brightVary) {
    this.gen = gen;
    this.col = col;
    
    let hueMargin = rand(-5, 5);
    let satMargin = rand(10, 25);
    let brightMargin = rand(10, 25);
    
    this.col2 = [
      col[0] + hueMargin,
      col[1] > 50 ? col[1] - satMargin : col[1] + satMargin, 
      col[2] > 50 ? col[2] - brightMargin : col[2] + brightMargin
    ];

    if (dice(0.5)) {
      let colTemp = this.col;
      this.col = this.col2;
      this.col2 = colTemp;
    }

    this.gradient = dice(gradientRate);
    this.mint = 0.40 * mod1;
    this.maxt = 1.0 - 0.4 * mod1;
    this.speed = dice(0.5) ? 1.0 : -1.0; 
    this.off = rand(0, 100);
    this.radial = dice(radialThresh);

    if (this.gen > 0) {
      let col1 = perturbColor(this.col, hueVary, satVary, brightVary);
      let col2 = perturbColor(this.col, hueVary, satVary, brightVary);
      this.child1 = new Shard(col1, this.gen-1, radialThresh, gradientRate, hueVary, satVary, brightVary);
      this.child2 = new Shard(col2, this.gen-1, radialThresh, gradientRate, hueVary, satVary, brightVary);
    }
    
    this.update = function(t) {
      this.t = map(Math.sin(this.off + this.speed * t), -1, 1, this.mint, this.maxt);
      if (this.gen > 0) {
        this.child1.update(t);
        this.child2.update(t);
      }
    }
  }  

  let shard;
  let currentSeed;
  let T=0;
  
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
            trait_type: 'your trait here text',
            value: 'replace me',
          },
        ],
      };
    };
  };

  const draw = (p5) => {
    let R = Math.sqrt(width * width + height * height);
    let cx = width/2;
    let cy = height/2;
    let dR = 0.5;
    let dA = 0.002;
    let minR = 1;
    let minA = 0.001;
    
    let seed = parseInt(hash.slice(0, 16), 16);
    shuffleBag.current = new MersenneTwister(seed);

    let numRecursionsDice = rand(0, 1);
    if (numRecursionsDice > 0.9) {
      var numRecursions = 11;
      var recursionDampenGradient = 0.5;
    } else if (numRecursionsDice > 0.5) {
      var numRecursions = 10;
      var recursionDampenGradient = 0.75;
    } else {
      var numRecursions = 9;
      var recursionDampenGradient = 1.0;
    }

    var gradientRate = rand(0.85, 1.0);
    var gradientMinArea = 0.015;
    var gradientMaxArea = 0.055; 
    gradientRate *= recursionDampenGradient;
    gradientMinArea *= (1.0/recursionDampenGradient);
    gradientMaxArea *= (1.0/recursionDampenGradient);
    
    var decayTriggerProb = rand(0.035, 0.3);
    var radialThresh = rand(0.05, 0.66);
    
    var radialDice = rand(0, 1);
    if (radialDice < 0.01) {
      radialThresh = 0.0;
    } else if (radialDice < 0.02) {
      radialThresh = 1.0;
    } 
        
    var hueVary = rand(5.0, p5.map(numRecursions, 9, 12, 8, 5));
    var satVary = rand(5.0, p5.map(numRecursions, 9, 12, 25, 12));
    var brightVary = rand(5.0, p5.map(numRecursions, 9, 12, 35, 20));
    
    var ang0 = rand(0, 2.0 * Math.PI);
    var baseColor = [rand(0, 360), rand(40, 100), rand(30, 100)];    
    
    shard = new Shard(baseColor, numRecursions, radialThresh, gradientRate, hueVary, satVary, brightVary);

    if (currentSeed != seed) {
      currentSeed = seed;
      T = 0;
    }

    var speed = p5.map(mod2 < 1e-3 ? 0 : mod2, 0, 1, 0, p5.map(mod1, 0.0, 1.0, 0.001, 0.022));
    T += speed;
    shard.update(T);
    
    // =========== SEGMENT ============ //
    function drawSegment(s, rad1, rad2, ang1, ang2, fill, stroke) {
      let area = (rad2-rad1) * (ang2-ang1) / R;
      let strokeStyleAlpha = p5.constrain(p5.map(area, 0, 0.025, 0.1, 1), 0.1, 1);
      let lineWidth = p5.map(area, 0, 0.1, R/2750, R/1000 );
  
      let areaRatio = 0;
      if (s.gradient) {
        areaRatio = p5.constrain((area - gradientMinArea)/(gradientMaxArea - gradientMinArea), 0, 1);
      }
      if (s.gradient && areaRatio > 0) {
        var colG = [
          p5.lerp(s.col[0], s.col2[0], areaRatio),
          p5.lerp(s.col[1], s.col2[1], areaRatio),
          p5.lerp(s.col[2], s.col2[2], areaRatio)
        ]
        var grd = p5.drawingContext.createRadialGradient(width/2, height/2, rad1, width/2, height/2, rad2);
        grd.addColorStop(0, colorToHTML(s.col, 1.0));
        grd.addColorStop(1, colorToHTML(colG, 1.0));
        p5.drawingContext.fillStyle = grd;
      }
      else {
        p5.drawingContext.fillStyle = colorToHTML(s.col, 1.0);
      }

      p5.drawingContext.strokeStyle = colorToHTML(s.col2, strokeStyleAlpha);      
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

    // =========== SHARD ============ //
    function drawShard(s, rad1, rad2, ang1, ang2, fill, stroke, decayTrigger) {
      if (s.gen == 0) {
        var r = rad1 + rad2;
        if (Math.abs(rad1-rad2) > minR && Math.abs(ang1-ang2) > minA) {
          drawSegment(s, 
            rad1, rad2, ang1+ang0, ang2+ang0, 
            decayTrigger ? !fill : fill, 
            decayTrigger ? !stroke: stroke
          );
        }
      } 
      else {
        if (s.radial) {
          decayTrigger = decayTrigger || dice(decayTriggerProb);
          drawShard(s.child1, rad1, rad1 + s.t * (rad2 - rad1) + dR, ang1, ang2, fill, stroke, decayTrigger);
          drawShard(s.child2, rad1 + s.t * (rad2 - rad1), rad2, ang1, ang2, fill, stroke, decayTrigger);
        } 
        else {
          drawShard(s.child1, rad1, rad2, ang1, ang1 + s.t * (ang2 - ang1) + dA, fill, stroke, decayTrigger);
          drawShard(s.child2, rad1, rad2, ang1 + s.t * (ang2 - ang1), ang2, fill, stroke, decayTrigger);  
        }
      }
    }

    // draw background gradient
    p5.colorMode(p5.HSB, 360, 100, 100);
    p5.background(baseColor);
    
    let grd = p5.drawingContext.createRadialGradient(width/2, height/2, rand(R/5, R/3), width/2, height/2, rand(R/2, 2*R/3));

    let bg1 = baseColor;
    //let bg2 = perturbColor(baseColor, 10, 30, 30);

    let bg2 = [
      baseColor[0] + rand(-10, 10),
      baseColor[1] + (baseColor[1] > 50? -1 : 1) * rand(20, 30),
      baseColor[2] + (baseColor[2] > 50? -1 : 1) * rand(20, 30)
    ]

    if (dice(0.5)) {
      grd.addColorStop(0, p5.color(bg1));
      grd.addColorStop(1, p5.color(bg2));
    } else {
      grd.addColorStop(0, p5.color(bg2));
      grd.addColorStop(1, p5.color(bg1));
    }
    p5.drawingContext.fillStyle = grd;
    p5.drawingContext.fillRect(-1, -1, width+1, height+1);

    let decayTrigger = dice(decayTriggerProb);

    drawShard(shard, 
      0, R, 
      0, 2.0 * Math.PI, 
      false, true, 
      decayTrigger
    );

    // framerate
    p5.stroke(0);
    p5.fill(0);
    p5.textSize(20);

    if (radialDice < 0.01) {
      p5.text("*", 100, 20);
    } else if (radialDice < 0.02) {
      p5.text("**", 100, 20);
    } 
    
    p5.text(Math.floor(p5.frameRate())+ " fps ("+numRecursions+")", 2, 20);

    // example assignment of hoisted value to be used as NFT attribute later
    hoistedValue.current = numRecursions;
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
    mod2: 0.0
  },
};

export { styleMetadata };
