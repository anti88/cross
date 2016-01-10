var gl;
var shaderProgram;
var shaderProgramTex;
var frames = 0;
var time = undefined;
var canvWallW = 0;
var canvWallH = 0;
const CANV_ID = 'canv';
const WEBGL_X = 16;
const WEBGL_Y = 6;
const GL_RESOLUTION = 800;
var fragmentShader;
var vertexShader;
var fragmentShaderTex;
var vertexShaderTex;

function canvDraw(game)
{
	frames = 0;
	time = undefined;
	canvWallW = 0;
	canvWallH = 0;



	$("#"+CANV_ID).show();
	var can = document.getElementById(CANV_ID);

	var global = {md:false, x: 0,player:{x:0,y:0,s:1, a:0},ang:angular.element(document.getElementById('mpGame')).controller(),npcGrabbed:false,keyState:{}};
	global.ang.setRunning(true);

	addListeners(can, global, game);

	if(!initGL(can, global))
	{
		alrt("Dieser Browser beherrscht leider kein WebGL :(");
		return false;
	}

	initShadersTex();

	canvResize();


	recursiveTextureLoad(can, game, global, [
		{n:"ressources/figur.png"},]
		,0);
	return true;
}


function calcFrames(global, game)
{
	if(time === undefined)
		time = new Date();

	var actual = new Date();

	if(actual.getTime() - time.getTime() > 1000)
	{
		$("#canvFrames").html("FPS: " + frames).show();
		frames = 0;
		time = new Date();
	}
	else
		frames ++;
}



function viewWallCollision(game, global)
{
	//viewmatrix
	var maxL = WEBGL_X * ((game.backgrounds.length-1)*2);
	var minL = 0;

	if(global.x > minL)
		global.x = minL;
	if(global.x < -maxL)
		global.x = -maxL;
}

function npcWallCollision(npc, global)
{
	//TOP
	if(npc.y > WEBGL_Y - npc.s)
		npc.y = WEBGL_Y - npc.s;
	//BOTTOM
	else if(npc.y < npc.s - WEBGL_Y)
		npc.y = npc.s - WEBGL_Y;

	//LEFT
	if(npc.x + global.x < npc.s - WEBGL_X)
		npc.x = npc.s- WEBGL_X - global.x;
	//RIGHT
	else if(npc.x + global.x > WEBGL_X - npc.s)
		npc.x = WEBGL_X - npc.s - global.x;
}

function canvEndless(can ,game, global, tex)
{
	calcFrames(global, game);

	calcInput(global, game);
	drawScene(game, global, tex);

	requestAnimFrame(function()
	{
		if(global.ang.getRunning())
		{
			global.ang.setGame(game);
			canvEndless(can ,game, global, tex);
		}
		else
			cleanUp()
	});
}

function calcInput(global, game)
{
	if(global.keyState[68])
	{
		game.players[myId].x += 0.1;
	}
	if(global.keyState[65])
	{
		game.players[myId].x -= 0.1;
	}
	if(global.keyState[87])
	{
		game.players[myId].y += 0.1;
	}
	if(global.keyState[83])
	{
		game.players[myId].y -= 0.1;
	}
}

function canvResize()
{
	if(gl)
	{
		var jCan = $("#"+CANV_ID);
		jCan.height(jCan.width() / WEBGL_X * WEBGL_Y);
	}

	gl.clearColor(0.9, 0.9, 0.9, 1.0);


	mat4.ortho(-WEBGL_X,WEBGL_X,-WEBGL_Y,WEBGL_Y,1,0.0,pMatrix);
	mat4.identity(mvMatrix);

}

function initGL(can, global)
{
	can.width = GL_RESOLUTION;
	can.height = GL_RESOLUTION;

	try
	{
		gl = can.getContext("webgl");
		gl.viewportWidth = can.width;
		gl.viewportHeight = can.height;
	}
	catch (e)
	{
		return false;
	}
	return true;
}

function cleanUp()
{
	setConfig("loadedLevel", "empty");

	if(shaderProgram)
	{
		gl.detachShader(shaderProgram, vertexShader);
		gl.detachShader(shaderProgram, fragmentShader);
		gl.deleteProgram(shaderProgram);
	}


	if(shaderProgramTex)
	{
		gl.detachShader(shaderProgramTex, vertexShaderTex);
		gl.detachShader(shaderProgramTex, fragmentShaderTex);
		gl.deleteProgram(shaderProgramTex);
	}
}

function initShaders()
{
	fragmentShader = getShaderByString(gl, getFShader(), "x-shader/x-fragment")
	vertexShader = getShaderByString(gl, getVShader(), "x-shader/x-vertex")


	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
	{
		alert("Shader konnten nicht initialisiert werden!");
	}

	gl.useProgram(shaderProgram);

	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

	shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
	gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");

	return true;
}


var mvMatrix = mat4.create();
var pMatrix = mat4.create();


function drawScene(game, global, tex)
{
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	for(var i in global.ang.getGame().players)
	{
		if(global.ang.getGame().players[i])
			if(global.ang.getGame().players[i].id != myId)
			{
				glDrawCircleTex(global.ang.getGame().players[i].x, global.ang.getGame().players[i].y, global.ang.getGame().players[i].s, global.ang.getGame().players[i].a, tex[0].t);
			}
	}
}



function testAllCollisions(npc, global,game, npc, withplayer)
{
	for(var i = 0; i < game.enemies.length; i++)
	{
		if(coll_circle_circle(npc.x, npc.y, npc.s, game.enemies[i].x,  game.enemies[i].y,  game.enemies[i].s))
			return true;
	}
	for(var i = 0; i < game.goodies.length; i++)
	{
		if(coll_circle_circle(npc.x, npc.y, npc.s, game.goodies[i].x,  game.goodies[i].y,  game.goodies[i].s))
			return true;
	}
	if(withplayer)
		if(coll_circle_circle(npc.x, npc.y, npc.s, global.player.x,  global.player.y,  global.player.s))
			return true;
}

function unchooseAllNpcs(game)
{
	for(var i = 0; i < game.enemies.length; i++)
	{
		game.enemies[i].choosen = false;
	}
	for(var i = 0; i < game.goodies.length; i++)
	{
		game.goodies[i].choosen = false;
	}
}

function addListeners(can, global, game)
{
	window.addEventListener('keydown',function(e){global.keyState[e.keyCode || e.which] = true;},true);
	window.addEventListener('keyup',function(e){global.keyState[e.keyCode || e.which] = false;},true);


	can.addEventListener("contextmenu", function(e){ mouseClickR(e, global); }.bind(this));
}



/*
 * calculates canvas coordinates from an mouse event
 *
 */
function getCanvasCoord(e)
{
	var jCan = $("#"+CANV_ID);
	var can = document.getElementById(CANV_ID);
	var rect = can.getBoundingClientRect();
	if(!rect)
		die("BoundingClientRect is not supported by this browser!");

	var x = e.clientX-rect.left-(jCan.width()/2);
	var y = e.clientY-rect.top-(jCan.height()/2);

	var mx = x/(jCan.width()/2)*WEBGL_X;
	var my = y/(jCan.height()/2)*WEBGL_Y;


	return {x: mx , y: -my};
}



function coll_circle_circle(x1, y1, r1, x2, y2, r2)
{

	var circ1 = Math.sqrt(Math.abs(x1-x2)*Math.abs(x1-x2)+Math.abs(y1-y2)*Math.abs(y1-y2));
	var circ2 = parseFloat(r1)+parseFloat(r2);

	if( circ1 < circ2)
	{
		return 1;
	}
	else
		return 0;
}






//								WEBGL FUNCTIONS

//								GENERIC
function getShaderByString(gl, str, type)
{
	var shader;
	if (type == "x-shader/x-fragment")
	{
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	}
	else if (type == "x-shader/x-vertex")
	{
		shader = gl.createShader(gl.VERTEX_SHADER);
	}
	else
	{
		return null;
	}

	gl.shaderSource(shader, str);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
	{
		alert(gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}


function setMatrixUniforms()
{
	gl.uniformMatrix4fv(shaderProgramTex.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(shaderProgramTex.mvMatrixUniform, false, mvMatrix);
}





//								WITH TEXTURES

function getVShaderTex()
{
	var str = "";

	str += "attribute vec3 aVertexPosition;";
	str += "attribute vec2 aTextureCoord;";
	str += "uniform mat4 uMVMatrix;";
	str += "uniform mat4 uPMatrix;";
	str += "varying vec2 vTextureCoord;";

	str += "void main(void)";
	str += "{";
		str += "gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);";
		str += "vTextureCoord = aTextureCoord;";
	str += "}";

	return str;
}

function getFShaderTex()
{
	var str = "";

	str += "precision mediump float;";
	str += "varying vec2 vTextureCoord;";
	str += "uniform sampler2D uSampler;";

	str += "void main(void)";
	str += "{";
		str += "gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));";
	str += "}";

	return str;
}

function initShadersTex()
{
	fragmentShaderTex = getShaderByString(gl, getFShaderTex(), "x-shader/x-fragment");
	vertexShaderTex = getShaderByString(gl, getVShaderTex(), "x-shader/x-vertex");

	shaderProgramTex = gl.createProgram();
	gl.attachShader(shaderProgramTex, vertexShaderTex);
	gl.attachShader(shaderProgramTex, fragmentShaderTex);
	gl.linkProgram(shaderProgramTex);

	if (!gl.getProgramParameter(shaderProgramTex, gl.LINK_STATUS))
	{
		alert("Could not initialise shaders");
	}

	gl.useProgram(shaderProgramTex);

	shaderProgramTex.vertexPositionAttribute = gl.getAttribLocation(shaderProgramTex, "aVertexPosition");
	gl.enableVertexAttribArray(shaderProgramTex.vertexPositionAttribute);

	shaderProgramTex.textureCoordAttribute = gl.getAttribLocation(shaderProgramTex, "aTextureCoord");
	gl.enableVertexAttribArray(shaderProgramTex.textureCoordAttribute);

	shaderProgramTex.pMatrixUniform = gl.getUniformLocation(shaderProgramTex, "uPMatrix");
	shaderProgramTex.mvMatrixUniform = gl.getUniformLocation(shaderProgramTex, "uMVMatrix");
	shaderProgramTex.samplerUniform = gl.getUniformLocation(shaderProgramTex, "uSampler");
}

function handleLoadedTexture(texture)
{
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.bindTexture(gl.TEXTURE_2D, null);
}

function recursiveTextureLoad(can ,game, global, tex, num)
{
	tex[num].t = gl.createTexture();
	tex[num].t.image = new Image();
	tex[num].t.image.src = tex[num].n;

	tex[num].t.image.onload = function ()
	{
		handleLoadedTexture(tex[num].t);

		if(num < tex.length-1)
			recursiveTextureLoad(can ,game, global, tex, num+1);
		else
		{
			modal.hidePleaseWait();
			canvEndless(can ,game, global, tex);
		}
	}
}




function lowLvlGLDrawTex(posC, texC, tex, type)
{
	//POS COORDS
	var posB = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, posB);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(posC), gl.STATIC_DRAW);
	posB.itemSize = 2;
	posB.numItems = posC.length / 2;

	//TEX COORDS
	var texB = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, texB);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texC), gl.STATIC_DRAW);
	texB.itemSize = 2;
	texB.numItems = texC.length / 2;


	gl.bindBuffer(gl.ARRAY_BUFFER, posB);
	gl.vertexAttribPointer(shaderProgramTex.vertexPositionAttribute, posB.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, texB);
	gl.vertexAttribPointer(shaderProgramTex.textureCoordAttribute, texB.itemSize, gl.FLOAT, false, 0, 0);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.uniform1i(shaderProgramTex.samplerUniform, 0);

	setMatrixUniforms();
	gl.drawArrays(type, 0, posB.numItems);
}



function glDrawRectangleTex(x, y, xs, ys, tex)
{
	posC = [
		x+xs, y+ys,
		x-xs, y+ys,
		x+xs, y-ys,
		x-xs, y-ys,
	];


	var texC = [
	1.0, 1.0,
	0.0, 1.0,
	1.0, 0.0,
	0.0, 0.0,
	];

	lowLvlGLDrawTex(posC, texC, tex, gl.TRIANGLE_STRIP);
}


function glDrawCircleTex(x, y, s, a, tex)
{
	var vcount = 30;
	var angle = a / 360 * Math.PI * 2;

	var posC = Array();
	var texC = Array();

	for (var j = 0; j < vcount; ++j)
	{
		var prozent = (j / (vcount-2));
		var rad = prozent * 2.0 * Math.PI;

		var aussenx = x + s * Math.cos(rad+angle);
		var ausseny = y + s * Math.sin(rad+angle);
		var texx = (0.5*Math.cos(rad))+0.5;
		var texy = (0.5*Math.sin(rad))+0.5;


		texC.push(texx);
		texC.push(texy);
		posC.push(aussenx);
		posC.push(ausseny);
	}


	lowLvlGLDrawTex(posC, texC, tex, gl.TRIANGLE_FAN);
}









////////////TODO AUSMISTEN UND UMBENENNEN!!!

function glDrawSquare(x, y, s, r, g, b)
{
	verts = [
		x+s,  y+s,
		x-s,  y+s,
		x+s,  y-s,
		x-s,  y-s,
	];


	var color = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, color);
	colors = []
	for (var i=0; i < 4; i++)
	{
		colors = colors.concat([r, g, b, 1.0]);
	}

	lowLvlGLDraw(verts, 4, colors, gl.TRIANGLE_STRIP);
}

function glDrawTriangle(x, y, s, r, g, b)
{
	var verts = [
		 x,         y+s,
		 x-(s/2.0), y-s,
		 x+(s/2.0), y-s,
	];


	var color = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, color);
	var colors = [
		r, g, b, 1.0,
		r, g, b, 1.0,
		r, g, b, 1.0
	];

	lowLvlGLDraw(verts, 3, colors, gl.TRIANGLES);
}

function glDrawCircle(x, y, s, r, g, b)
{
	var vcount = 20;
	var verts = Array();
	var colors = Array();

	for (var j = 0; j < vcount; ++j)
	{
		var prozent = (j / (vcount-2));
		var rad = prozent * 2.0 * Math.PI;

		var aussenx = x + s * Math.cos(rad);
		var ausseny = y + s * Math.sin(rad);

		colors.push(r);
		colors.push(g);
		colors.push(b);
		colors.push(1);
		verts.push(aussenx);
		verts.push(ausseny);
	}
	lowLvlGLDraw(verts, vcount, colors, gl.TRIANGLE_FAN);
}


function lowLvlGLDraw(verts, vcount, colors, type)
{

	var pos = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, pos);

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
	pos.itemSize = 2;
	pos.numItems = vcount;



	var col = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, col);

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
	col.itemSize = 4;
	col.numItems = vcount;



	gl.bindBuffer(gl.ARRAY_BUFFER, pos);
	gl.vertexAttribPointer(shaderProgramTex.vertexPositionAttribute, pos.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, col);
	gl.vertexAttribPointer(shaderProgramTex.vertexColorAttribute, col.itemSize, gl.FLOAT, false, 0, 0);

	setMatrixUniforms();
	gl.drawArrays(type, 0, pos.numItems);
}





function getVShader()
{
	var str = "";

	str += "attribute vec3 aVertexPosition;";
	str += "attribute vec4 aVertexColor;";
	str += "uniform mat4 uMVMatrix;";
	str += "uniform mat4 uPMatrix;";
	str += "varying vec4 vColor;";

	str += "void main(void)";
	str += "{";
		str += "gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);";
		str += "vColor = aVertexColor;";
	str += "}";

	return str;
}

function glDrawRectangle(x, y, xs, ys, r, g, b)
{
	verts = [
		x+xs, y+ys,
		x-xs, y+ys,
		x+xs, y-ys,
		x-xs, y-ys,
	];


	var color = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, color);
	colors = []
	for (var i=0; i < 4; i++)
	{
		colors = colors.concat([r, g, b, 1.0]);
	}

	lowLvlGLDraw(verts, 4, colors, gl.TRIANGLE_STRIP);
}

function glDrawTriangle(x, y, s, r, g, b)
{
	var verts = [
		 x,     y+s,
		 x-(s/2.0), y-s,
		 x+(s/2.0), y-s,
	];


	var color = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, color);
	var colors = [
		r, g, b, 1.0,
		r, g, b, 1.0,
		r, g, b, 1.0
	];

	lowLvlGLDraw(verts, 3, colors, gl.TRIANGLES);
}

function glDrawCircle(x, y, s, r, g, b)
{
	var vcount = 30;
	var verts = Array();
	var colors = Array();

	for (var j = 0; j < vcount; ++j)
	{
		var prozent = (j / (vcount-2));
		var rad = prozent * 2.0 * Math.PI;

		var aussenx = x + s * Math.cos(rad);
		var ausseny = y + s * Math.sin(rad);

		colors.push(r);
		colors.push(g);
		colors.push(b);
		colors.push(1);
		verts.push(aussenx);
		verts.push(ausseny);
	}
	lowLvlGLDraw(verts, vcount, colors, gl.TRIANGLE_FAN);
}

function getFShader()
{
	var str = "";

	str += "precision mediump float;";
	str += "varying vec4 vColor;";

	str += "void main(void)";
	str += "{";
		str += "gl_FragColor = vColor;";
	str += "}";

	return str;
}



function getShaderById(gl, id)
{
	var shaderScript = document.getElementById(id);
	if (!shaderScript)
	{
		return null;
	}

	var str = "";
	var k = shaderScript.firstChild;
	while (k)
	{
		if (k.nodeType == 3)
		{
				str += k.textContent;
		}
		k = k.nextSibling;
	}

	var shader;
	if (shaderScript.type == "x-shader/x-fragment")
	{
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	}
	else if (shaderScript.type == "x-shader/x-vertex")
	{
		shader = gl.createShader(gl.VERTEX_SHADER);
	}
	else
	{
		return null;
	}

	gl.shaderSource(shader, str);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
	{
		alert(gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}

window.requestAnimFrame = (function()
{
	//uses browser-native animation frames
	return window.requestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	window.oRequestAnimationFrame ||
	window.msRequestAnimationFrame ||
	function(callback,element)
	{
		window.setTimeout(callback, 1000/60);
	};
})();
