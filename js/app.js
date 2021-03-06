var canvas = document.getElementById("canvas"),
    ctx = canvas.getContext("2d"),
    painting = false,
    lastX = 0,
    lastY = 0,
    lineThickness = 1,
    thicknessEase = 0.5;

var buffer = document.getElementById("buffer"),
    bufferctx = buffer.getContext("2d");

var w = 1200;
var h = 1600; 
var sketch = document.getElementById("sketch");
var sketchctx = sketch.getContext("2d");

var maxThickness = 3;

var penStyle = "rgba(0,0,0,0.5)";
var fadeStyle = "rgba(0,0,0,0)";
var backStyle = "rgba(240,240,240,1)";
var eraserStyle = "rgba(240,240,240,0.3)";
var fadeBack = "rgba(240,240,240,0)";

var strokes = [];
var currentStroke;

var undoLimit = 16;

var redoStack = [];

var tool = 0;
// 0 = pen
// 1 = eraser

var newlyCreated = false;

$(document).ready(function() { 
    resizeCanvas();
    drawBackground(sketchctx);
});

window.addEventListener('resize',resizeCanvas(),false);

function newCanvas() {
    bufferctx.clearRect(0,0,w,h);
    bufferctx.drawImage(sketch,0,0);
    // resizeCanvas();
    drawBackground(sketchctx);

    strokes = [];
    redoStack = [];

    strokes.push(new stroke());

    $.bootstrapGrowl("New Sketch Created", {delay: 3000,allow_dismiss: false});

    newlyCreated = true;

}


function resizeCanvas() {
    // w = window.innerWidth;
    // h = window.innerHeight;

    canvas.width = w;
    canvas.height = h;
    sketch.width = w;
    sketch.height = h;

    buffer.width = w;
    buffer.height = h;

    $(".surface").css("margin-left", function() { return -w/2; });
}

function stroke() {
  this.x = [];
  this.y = [];
  this.thickness = [];
  this.tool = 0;
}

function fillCircle(ctx,x,y,radius)
{
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = penStyle;
    ctx.fill();
}

function fillCircleEraser(ctx,x,y,radius)
{
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = eraserStyle;
    ctx.fill();
}

function fillEraser(ctx,x,y,radius)
{
    var gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, eraserStyle);
    gradient.addColorStop(1, fadeBack);
    
    ctx.beginPath();
    ctx.arc(x, y, w, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.closePath();
}

function drawBackground(ctx) {
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = backStyle;
    ctx.fillRect(0, 0, w, h);
}

function drawStyle(ctx,x,y,thickness,tool)
{

    switch (tool)
    {
        default:
            // THIN INK //
            ctx.fillRect(x,y,thickness,thickness);
            fillCircle(ctx,x+thickness/4,y+thickness/4,thickness/2);
        break;

        case 1:
            // ERASER //
            var markerWidth = 15;
            fillCircleEraser(ctx,x+markerWidth/2,y+markerWidth/2,markerWidth);
        break;
    }

    // THIN PEN //
    //ctx.fillRect(x,y,thickness,thickness);

    // THIN INK //
    //ctx.fillRect(x,y,thickness,thickness);
    //fillCircle(ctx,x+thickness/4,y+thickness/4,thickness/2);

    // INK PEN
    //ctx.fillRect(x,y,thickness,thickness);
    //fillCircle(ctx,x,y,thickness);

    // MARKER
    
}

function drawStroke(ctx, stroke)
{
    for (var i = 0; i < stroke.x.length; i += 1)
    {
        drawStyle(ctx,stroke.x[i],stroke.y[i],stroke.thickness[i],stroke.tool);
    }
}

function drawAllStrokes(ctx){
    ctx.clearRect(0,0,w,h);
    drawBackground(ctx);
    ctx.fillStyle = penStyle;
    for (var i = 0; i < strokes.length; i += 1)
    {
        var s = strokes[i];
        drawStroke(ctx, s);
    }
}
function drawAllStrokesNoClear(ctx){
    ctx.fillStyle = penStyle;
    for (var i = 0; i < strokes.length; i += 1)
    {
        var s = strokes[i];
        drawStroke(ctx, s);
    }
}
function undoStroke() {
    if (strokes.length>0)
    {
        drawBackground(sketchctx);
        redoStack.push(strokes.pop());
        sketchctx.drawImage(buffer,0,0);
        drawAllStrokesNoClear(sketchctx);
        console.log("undo");
    }
}
    
function addStroke() {
    if (currentStroke.x.length > 2)
    {
        redoStack = [];
        strokes.push(currentStroke);

        if (strokes.length > undoLimit)
        {
            strokes.reverse();
            var oldStroke = strokes.pop();
            strokes.reverse();

            drawStroke(bufferctx,oldStroke);
        }
        else
        {
            if (newlyCreated)
            {
                bufferctx.clearRect(0,0,w,h);
                newlyCreated = false;
            }
            
        }
        //drawAllStrokes(sketchctx);
    }
    
}
function redoStroke() {
    if (redoStack.length>0)
    {
        drawBackground(sketchctx);
        strokes.push(redoStack.pop());
        sketchctx.drawImage(buffer,0,0);
        drawAllStrokesNoClear(sketchctx);
    }
    
}

canvas.onmousedown = function(e) {
    painting = true;
 
    currentStroke = new stroke();
    currentStroke.tool = tool;
    
    ctx.fillStyle = penStyle;
    lastX = e.pageX - this.offsetLeft;
    lastY = e.pageY - this.offsetTop;
};

canvas.onmouseup = function(e){
    painting = false;

    sketchctx.drawImage(canvas,0,0);
    addStroke();

    ctx.clearRect(0,0,canvas.width,canvas.height);

}

canvas.onmousemove = function(e) {
    if (painting) {
        mouseX = e.pageX - this.offsetLeft;
        mouseY = e.pageY - this.offsetTop;

        // find all points between        
        var x1 = mouseX,
            x2 = lastX,
            y1 = mouseY,
            y2 = lastY;

        switch (tool)
        {
            default:
                var steep = (Math.abs(y2 - y1) > Math.abs(x2 - x1));
                if (steep){
                    var x = x1;
                    x1 = y1;
                    y1 = x;

                    var y = y2;
                    y2 = x2;
                    x2 = y;
                }
                if (x1 > x2) {
                    var x = x1;
                    x1 = x2;
                    x2 = x;

                    var y = y1;
                    y1 = y2;
                    y2 = y;
                }

                var dx = x2 - x1,
                    dy = Math.abs(y2 - y1),
                    error = 0,
                    de = dy / dx,
                    yStep = -1,
                    y = y1;
                
                if (y1 < y2) {
                    yStep = 1;
                }
                
                targetLineThickness = maxThickness - Math.sqrt((x2 - x1) *(x2-x1) + (y2 - y1) * (y2-y1))/(10);
                if (lineThickness > targetLineThickness + thicknessEase)
                {
                    lineThickness -= thicknessEase;
                }
                else if (lineThickness < targetLineThickness - thicknessEase)
                {
                    lineThickness += thicknessEase;
                }
                else
                {
                    lineThickness = targetLineThickness;
                }
                if(lineThickness < 1){
                    lineThickness = 1;   
                }

                for (var x = x1; x < x2; x++) {
                    if (steep) {
                        currentStroke.x.push(y);
                        currentStroke.y.push(x);
                        currentStroke.thickness.push(lineThickness);
                        drawStyle(ctx, y, x, lineThickness, tool );
                    } else {
                        currentStroke.x.push(x);
                        currentStroke.y.push(y);
                        currentStroke.thickness.push(lineThickness);
                        drawStyle(ctx, x, y, lineThickness, tool );
                    }
                    
                    error += de;
                    if (error >= 0.5) {
                        y += yStep;
                        error -= 1.0;
                    }
                }


                lastX = mouseX;
                lastY = mouseY;
            break;

            case 1:
                x = e.pageX - this.offsetLeft;
                y = e.pageY - this.offsetTop;
                
                // the distance the mouse has moved since last mousemove event
                var dis = Math.sqrt(Math.pow(lastX-x, 2)+Math.pow(lastY-y, 2));
                
                // for each pixel distance, draw a circle on the line connecting the two points
                // to get a continous line.
                for (i=0;i<dis;i+=1) {
                    var s = i/dis;
                    currentStroke.x.push(lastX*s + x*(1-s));
                    currentStroke.y.push(lastY*s + y*(1-s));
                    currentStroke.thickness.push(w);
                    drawStyle(ctx,lastX*s + x*(1-s), lastY*s + y*(1-s),w, tool);
                }
                lastX = x;
                lastY = y;
            break;

        }
        
    }
}

// TOOLS
function pen_tool() {
    tool = 0;
    $(".tool-icon").removeClass("active");
    $("#pen").addClass("active");
}

function eraser_tool() {
    tool = 1;
    $(".tool-icon").removeClass("active");
    $("#eraser").addClass("active");
}

window.onbeforeunload = confirmExit;
function confirmExit()
{
    return "Unsaved data will be lost.";
}