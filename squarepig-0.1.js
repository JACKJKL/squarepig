pig = {
	canvas: null,
	context: null,
	images: {},
	audio: {},
	world: null,
	mouse: {x: undefined, y: undefined, pressed: false},
	offset: [0, 0],
	fps: 60
}

pig.init = function(canvas) {
	this.canvas = canvas ;
	this.context = canvas.getContext('2d'); ;
	this.world = new pig.World() ;
	this.canvas.onmousedown = pig._canvasMouseDown ;
	document.onkeydown = pig.keyDown ;
	this.canvas.onmousemove = pig.mouseMove ;
	this.canvas.onmouseout = pig.mouseOut ;

	if (document.defaultView && document.defaultView.getComputedStyle) {
		var paddingLeft = +(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'])      || 0 ;
		var paddingTop  = +(document.defaultView.getComputedStyle(canvas, null)['paddingTop'])       || 0 ;
		var borderLeft  = +(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'])  || 0 ;
		var borderTop   = +(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'])   || 0 ;
		pig.offset = [paddingLeft + borderLeft, paddingTop + borderTop] ;
	}

	pig.canvas.width = pig.canvas.clientWidth ;
	pig.canvas.height = pig.canvas.clientHeight ;
} ;

pig.imageError = function(url) {
	alert("Could not load " + url + ".") ;
} ;

pig.loadImage = function(url) {
	if(url in this.images)
		return this.images[url] ;
	var i = new Image() ;
	i.src = url ;
	i.onload = function() { i.valid = true ; }
	i.onerror = function() { i.valid = false ; pig.imageError(i.src) ; } ;
	this.images[url] = i ;
	return i ;
} ;

pig.loadAudio = function(url) {
	var a = new Audio() ;
	a.src = url ;
	this.audio[url] = a ;
	return a ;
} ;

pig._mousePosition = function(e) {
	var ox = 0 ;
	var oy = 0 ;
	var element = pig.canvas ;
	if (element.offsetParent) {
		do {
			ox += element.offsetLeft;
			oy += element.offsetTop;
		} while ((element = element.parent)) ;
	}
	var mp = [e.pageX - ox + pig.offset[0], e.pageY - oy + pig.offset[1]] ;
	return mp ;
} ;

pig._canvasMouseDown = function(event) {
	pig.mouseDown() ;
} ;
pig.keyDown = function(event) {
	pig.world.keyDown(event.keyCode) ;
} ;

pig.mouseDown = function() {
	pig.world.mouseDown() ;
} ;

pig.mouseMove = function(event) {
	var mousePos = pig._mousePosition(event) ;
	pig.mouse.x = mousePos[0] ;
	pig.mouse.y = mousePos[1] ;
} ;

pig.mouseOut = function(event) {
	pig.mouse.x = undefined ;
	pig.mouse.y = undefined ;
};

pig.run = function() {
	var dtime = 1000 / pig.fps ;
	pig.time = Date.now() ;
	setInterval(pig.update, dtime) ;
} ;

pig.update = function() {
	var dtime = (Date.now() - pig.time) / 1000 ;
	pig.world.update(dtime) ;
	pig.canvas.width = pig.canvas.clientWidth ;
	pig.canvas.height = pig.canvas.clientHeight ;
	pig.context.clearRect(0, 0, pig.canvas.width, pig.canvas.height) ;
	pig.world.draw() ;
	pig.time = Date.now() ;
} ;

pig.Object = function() {
	this.clone = function() {
		var f = function() {} ;
		f.prototype = this ;
		var o = new f() ;
		return o ;
	} ;

	this.extend = function(data) {
		var o = this.clone() ;
		for(var k in data) {
			o[k] = data[k] ;
		}
		return o ;
	} ;
}

pig.World = function() {
	pig.Object.apply(this) ;

	this.entities = [] ;
	this.removed = [] ;

	this.add = function(e) {
		this.entities.push(e) ;
	} ;

	this.draw = function() {
		this.entities.sort(function(lhs, rhs) {
			if(!lhs.graphic || !rhs.graphic)
				return 0 ;
			return lhs.graphic.z - rhs.graphic.z ;
		}) ;
		for(var e in this.entities) {
			this.entities[e].draw() ;
		}
	} ;

	this.filter = function(f) {
		l = [] ;
		for(var e in this.entities) {
			if(f(this.entities[e])) {
				l.push(this.entities[e]) ;
			}
		}
		return l ;
	} ;

	this.getType = function(type) {
		return this.filter(function(e) { return e.type == type ; }) ;
	} ;

	this.keyDown = function(key) {
		for(var e in this.entities) {
			this.entities[e].keyDown(key) ;
		}
	} ;

	this.keyUp = function(key) {
		for(var e in this.entities) {
			this.entities[e].keyUp(key) ;
		}
	} ;

	this.mouseDown = function() {
		for(var e in this.entities) {
			this.entities[e].mouseDown() ;
		}
	} ;

	this.remove = function(e) {
		this.removed.push(e) ;
	} ;

	this._update = function(dtime) {
		for(var e in this.entities) {
			if(this.entities[e].graphic)
				this.entities[e].graphic.update(dtime) ;
			this.entities[e].update(dtime) ;
		}
		for(var r in this.removed) {
			for(var e in this.entities) {
				if(this.entities[e] == this.removed[r])
					this.entities.splice(e, 1) ;
			}
		}
		this.removed = [] ;
	} ;

	this.update = function(dtime) { this._update(dtime) ; } ;
}

pig.Entity = function() {
	pig.Object.apply(this) ;

	this.graphic = null ;
	this.type = "entity" ;

	this.collide = function(rect) {
		return false ;
	} ;

	this.draw = function() {
		if(this.graphic)
			this.graphic.draw() ;
	} ;

	this.mouseDown = function() {} ;

	this.keyDown = function(key) {} ;

	this.keyUp = function(key) {} ;

	this.update = function(dtime) {} ;
}

pig.Graphic = function() {
	this.x = 0 ;
	this.y = 0 ;
	this.z = 0 ;

	this.draw = function() {}

	this.update = function(dtime) {}
} ;

pig.Rect = function(x, y, w, h) {
	pig.Object.apply(this) ;
	this.x = x ;
	this.y = y ;
	this.w = w ;
	this.h = h ;

	this.collidePoint = function(point) {
		return (
			point[0] >= this.x &&
			point[0] <  this.x + this.w &&
			point[1] >= this.y &&
			point[1] <  this.y + this.h
		) ;
	} ;

	this.collideRect = function(rect) {
		if(this.x > rect.x + rect.w)
			return false ;
		if(rect.x > this.x + this.w)
			return false ;
		if(this.y > rect.y + rect.h)
			return false ;
		if(rect.y > this.y + this.h)
			return false ;
		return true ;
	} ;

	this.place = function(pos) {
		this.x = pos[0] ;
		this.y = pos[1] ;
	} ;
}

pig.Circle = function(x, y, radius) {
	pig.Object.apply(this) ;

	this.x = x ;
	this.y = y ;
	this.radius = radius ;

	this.collideCircle = function(circle) {
		var dx = this.x - circle.x ;
		var dy = this.y - circle.y ;
		var sqDistance = dx*dx + dy*dy ;

		var r = this.radius + circle.radius ;
		var collide = (sqDistance <= r*r) ;
		return collide ;
	} ;

	this.collidePoint = function(point) {
		var d = [point[0] - this.x, point[1] - this.y] ;
		return (d[0]*d[0] + d[1]*d[1] <= this.radius*this.radius) ;
	} ;

	this.place = function(pos) {
		this.x = pos[0] ;
		this.y = pos[1] ;
	} ;
} ;

pig.Graphiclist = function(graphics) {
	pig.Graphic.apply(this) ;

	this.graphics = graphics || [] ;

	this.draw = function() {
		for(var g in this.graphics) {
			this.graphics[g].draw() ;
		}
	} ;

	this.update = function(dtime) {
		for(var g in this.graphics) {
			this.graphics[g].update(dtime) ;
		}
	} ;
} ;

pig.Canvas = function(x, y, w, h) {
	pig.Graphic.apply(this) ;

	this.x = x ;
	this.y = y ;
	this.w = w ;
	this.h = h  ;

	this.canvas = document.createElement('canvas') ;
	this.canvas.width = w ;
	this.canvas.height = h ;
	this.context = this.canvas.getContext('2d') ;

	this.draw = function() {
		pig.context.save() ;
		pig.context.translate(this.x, this.y) ;
		pig.context.drawImage(this.canvas, 0, 0) ;
		pig.context.restore() ;
	};

	this.update = function(dtime) {}
} ;

pig.Image = function(x, y, image) {
	pig.Graphic.apply(this) ;

	this.x = x ;
	this.y = y ;
	this.alpha = 1 ;

	if(!image)
		throw 'Image not specified.' ;

	this.image = pig.loadImage(image) ;

	this.draw = function() {
		if(!this.image.valid) return ;

		pig.context.save() ;
		pig.context.globalAlpha = this.alpha ;
		pig.context.translate(this.x, this.y) ;
		pig.context.drawImage(this.image, 0, 0) ;
		pig.context.globalAlpha = 1 ;
		pig.context.restore() ;
	};

	this.update = function(dtime) {
		this.width = this.image.width ;
		this.height = this.image.height ;
	}
} ;


pig.Sprite = function(x, y, image, frameW, frameH) {
	pig.Graphic.apply(this) ;

	this.x = x ;
	this.y = y ;
	this.origin = [0, 0] ;
	this.scale = 1 ;
	this.image = pig.loadImage(image) ;
	this.frame = 0 ;
	this.animations = {} ;
	this.animation = null ;
	this.fps = 0 ;
	this.time = 0 ;
	this.frameWidth = frameW ;
	this.frameHeight = frameH ;
	this.flip = false ;
	this.alpha = 1 ;

	this.add = function(animation, frames) {
		this.animations[animation] = frames ;
	} ;

	this.draw = function() {
		if(this.image.valid) {
			var px = this.x - (this.image.width/2)*(this.scale-1) ;
			var py = this.y - (this.image.height/2)*(this.scale-1) ;

			var fx = 0 ;
			if(this.animation) {
				var frame = this.animation[this.frame] ;
				fx = frame * this.frameWidth ;
			}
			pig.context.save() ;
			pig.context.globalAlpha = this.alpha ;
			pig.context.translate(this.x, this.y) ;
			if(this.flip) {
				pig.context.scale(-1, 1) ;
				pig.context.translate(-this.frameWidth, 0) ;
			}
			pig.context.drawImage(this.image, fx, 0, this.frameWidth, this.frameHeight, 0, 0, this.frameWidth * this.scale, this.frameHeight * this.scale) ;
			pig.context.globalAlpha = 1 ;
			pig.context.restore() ;
		}
	} ;

	this.place = function(pos) {
		this.x = pos[0] ;
		this.y = pos[1] ;
	} ;

	this.play = function(animation, fps) {
		this.animation = this.animations[animation] ;
		this.fps = fps ;
		this.frame = this.animations[animation][0] ;
		this.time = 0 ;
	} ;

	this.update = function(dtime) {
		this.time += dtime ;

		if(this.fps > 0 && this.time > 1 / this.fps) {
			++this.frame ;
			this.time -= 1 / this.fps ;
			if(this.frame >= this.animation.length) {
				this.frame -= this.animation.length ;
			}
		}
	} ;
} ;

pig.Text = function(x, y, text) {
	pig.Graphic.apply(this) ;
	this.x = x ;
	this.y = y ;
	this.text = text ;
	this.font = "sans" ;
	this.size = "10pt" ;

	this.draw = function() {
		pig.context.textBaseline = 'top' ;
		pig.context.font = this.size + " " + this.font ;
		pig.context.fillText(this.text, this.x, this.y) ;
	};
} ;

pig.Sfx = function(sound) {
	pig.Object.apply(this) ;

	this.play = function() {
		this.sound = pig.loadAudio(sound) ;
		this.sound.play() ;
	}
};

pig.key = {
	A: 65,
	B: 66,
	C: 67,
	D: 68,
	E: 69,
	F: 70,
	G: 71,
	H: 72,
	I: 73,
	J: 74,
	K: 75,
	L: 76,
	M: 77,
	N: 78,
	O: 79,
	P: 80,
	Q: 81,
	R: 82,
	S: 83,
	T: 84,
	U: 85,
	V: 86,
	W: 87,
	X: 88,
	Y: 89,
	Z: 90,

	ZERO:  48,
	ONE:   49,
	TWO:   50,
	THREE: 51,
	FOUR:  52,
	FIVE:  53,
	SIX:   54,
	SEVEN: 55,
	EIGHT: 56,
	NINE:  57,

	LEFT: 37,
	UP: 38,
	RIGHT: 39,
	DOWN: 40
};
pig.version = 0.1 ;
