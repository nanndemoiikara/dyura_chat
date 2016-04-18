var config     = require('./config/config.js'),
	io         = require('socket.io').listen(config.socket_port),
	http       = require('http'),
	fs         = require('fs'),
	ejs        = require('ejs'),
	path       = require('path'),
	_GET       = {},
	_POST      = {};

function ChatUser(socket, chatController)
{
	this.socket             = socket;
	this.chatUserController = chatController;
	this.socket_id          = socket.id;
	this.userName           = '';
	this.userColor          = '';
	this.sockets            = [];
	this.__construct();
}

ChatUser.prototype = {
	__construct : function ()
	{
		this.socket.on('connection', this.connection.bind(this));
		this.socket.on('disconnect', this.disConnect.bind(this));
		this.socket.on('sendMessage', this.sendMessage.bind(this));
	},
	connection : function(name, color)
	{
		this.changeUserData(name, color);
		this.sendMessage(name + 'さんが入室しました。', true);
	},
	disConnect : function()
	{
		this.sendMessage(this.name + 'さんが退室しました。', true);
		this.chatUserController.close(this.socket_id);
	},
	sendMessage : function(message, system_flg)
	{
		var sysFlg   = system_flg || false,
			targetId = message.match(/^@[a-zA-Z0-9_\-]+/g),
			msgData  = {
				id     : this.socket_id,
				name   : this.name,
				color  : this.color,
				sysMsg : sysFlg,
				value  : message
			},
			targetSocket;
		targetId     = ( targetId && targetId.length > 0 )?        targetId[0].replace('@', '') : '' ;
		targetSocket = ( targetId && targetId != this.socket_id )? io.sockets.to(targetId)      : false ;

		if ( sysFlg === false && targetSocket )
		{
			msgData.value = msgData.value.replace('@' + targetId + ' ', '');
			targetSocket.emit('getMessage', msgData);
			this.socket.emit('getMessage', msgData);
		}
		else
		{
			io.sockets.emit('getMessage', msgData);
		}
	},
	changeUserData : function(name, color)
	{
		var cL = config.color_list;
		this.name  = htmlspecialchars(name);
		this.color = ( ! cL[color] )? Object.keys(cL)[0] : color ;
	}
};

function htmlspecialchars(str)
{
    return str.replace(/&/g,"&amp;")
			.replace(/"/g,"&quot;")
			.replace(/'/g,"&#039;")
			.replace(/</g,"&lt;")
			.replace(/>/g,"&gt;") ;
}

function ChatUserController()
{
	this.sockets = {};
}
ChatUserController.prototype = {
	open : function(socket)
	{
		this.sockets[socket.id] = new ChatUser(socket, this);
	},
	close : function(socket_id)
	{
		if ( ! this.sockets[socket_id] ) return;
		delete this.sockets[socket_id];
	}
};
var CUC = new ChatUserController();

//Soket通信開始時の処理
io.sockets.on("connection", function (socket) {
	CUC.open(socket);
});


/**
 * Static HTTP Server
 *
 * Routing Paths 
 * js   /js/
 * css  /css/
 * html /server/views/
 **/

function Input(req)
{
	this._requestObj = req;
	this._construct();
}

Input.prototype = {
	contructor : Input,
	_construct : function()
	{
		/*var that = this;
		if ( this._requestObj.method === 'POST' )
		{
			var body = '';
			this._requestObj.addListener('data', function(data){
				body += data;
				if ( body.length > 1e6 ) that._requestObj.connection.destroy();
			});

			this._requestObj.addListener('end', function(){
				that._post_data = require('querystring').parse(body);
			});

		}
		var get_body   = require('url').parse(this._requestObj.url, true);
		this._get_data = get_body.query;*/
	},
	get : function(str)
	{
		if ( str === void(0) ) return _GET;
		return ( _GET[str] )? _GET[str] : null ;
	},
	post : function(str)
	{
		if ( str === void(0) ) return _POST;
		return ( _POST[str] )? _POST[str] : null ;
	}
};

function NodeController(res, req)
{
	this._view_dir    = __dirname + '/views/';
	this._ext         = 'ejs';
	this._responseObj = res;
	this._requestObj  = req;
	this.input        = new Input(req);
}

NodeController.prototype ={
	constructor : NodeController,
	dummy       : function(){},
	index       : function()
	{
		var data = {};
		data.colorList = config.color_list;
		this._view('index', data);
	},
	chat        : function()
	{
		var color = this.input.post('color'),
			name  = this.input.post('name'),
			data  = {};
		data.socket_url = '//' + config.host + ':' + config.socket_port + '/';
		data.base_url   = '//' + config.host + ':' + config.http_port + '/';
		try
		{
			if ( ! config.color_list[color] ) throw new Error('Validation Error Nothing Color');
			if ( ! name || name.length > 100  ) throw new Error('Validation Error Name Type');

			data.color = color;
			data.name  = name;
		}
		catch ( e )
		{
			console.log(e);
			return this.index();
		}
		return this._view('chat', data);
	},
	_remap   : function (segment)
	{
		var segments = segment.replace(/^\/+/, '').split('/'),
			that     = this;

		if ( segments[0] === '' ) segments[0] = 'index';
		try
		{
			return ( ! /^_/.test(segments[0]) && typeof(that[segments[0]]) === 'function' )? that[segments[0]](segments.splice(1)) : that._show_404();
		}
		catch ( e )
		{
			console.log(e);
			this._responseObj.writeHead(500);
			this._responseObj.end('Internal Server Error');
		}
	},
	_view    : function (path, data, render)
	{
		var opt       = data || {},
			that      = this,
			view_file = this._view_dir + path + '.' + this._ext,
			file_str  = '';

		if ( ! fs.existsSync(view_file) ) throw new Error('Not Found view File');
		file_str = ejs.render(fs.readFileSync(view_file, 'utf8'), opt);
		if ( render === true ) return file_str;

		this._responseObj.writeHead(200, { 'Content-Type' : 'text/html' });
		this._responseObj.end(file_str);
	},
	_show_404 : function()
	{
		this._responseObj.writeHead(404);
		this._responseObj.end('Requested file not found.');
	}
};

http.createServer(function(req, res) {
	var file      = req.url || 'index',
		path_info = file.match(/(.*)(?:\.([^.]+$))/),
		req_ext   = ( (path_info && path_info.length >= 2 )? path_info[2] : 'app' ),
		js_dir    = path.resolve(__dirname + '/../js'),
		css_dir   = path.resolve(__dirname + '/../css'),
		mimeType  = config.mimeTypes[req_ext],
		NC        = new NodeController(res, req),
		RBody     = '',
		viewPath  = ( req_ext == 'js' )? js_dir + file : css_dir + file ;
	req.on('data', function(data){
		RBody += data;
		if ( RBody.length > 1e6 ) req.connection.destroy();
	});

	req.on('end', function(){
		_POST = require('querystring').parse(RBody);
		_GET  = require('url').parse(req.url, true);
		if ( ['js', 'css'].indexOf(req_ext) === -1 ) return NC._remap(file);

		if ( ! fs.existsSync(viewPath) )
		{
			res.writeHead(400);
			res.end('Requested file not found.');
			return;
		}
		fs.readFile(viewPath, { encoding: 'utf8', flag: 'r' }, function(err, data) {
			if ( err ) {
				res.writeHead(500);
				res.end('Unexpected server error.');
				return;
			}


			res.writeHead(200, { 'Content-Type' : mimeType });
			res.end(data);
		});
	});
}).listen(config.http_port, config.host);
