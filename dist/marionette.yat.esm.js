/**
* @license
* Marionette.Yat extension for Backbone.Marionette
* Yet Another Toolkit
* ----------------------------------
* v0.0.8
*
* Distributed under MIT license
* author: dimtabu
*/


import Bb from 'backbone';
import Mn from 'backbone.marionette';
import _ from 'underscore';

var version = "0.0.8";

var getCompareABModel = function getCompareABModel(arg) {
	if (arg instanceof Bb.Model) return arg;else if (arg instanceof Mn.View) return arg.model;else return;
};
var getCompareABView = function getCompareABView(arg) {
	if (arg instanceof Bb.View) return arg;else return;
};

var compareAB = function compareAB(a, b, func) {
	if (typeof func === 'function') {
		a = func.call(a, getCompareABModel(a), getCompareABView(a));
		b = func.call(b, getCompareABModel(b), getCompareABView(b));
	}
	return a < b ? -1 : a > b ? 1 : 0;
};

/*
*	accepts:
*		variant #1: a, b, function
*		variant #2: [[a,b,function], [a,b,function]]
*		function can be undefined
*		example:
*			ascending	:		return viewComparator(viewA, viewB, function(model, view){ return model && model.get('someTextField') });
*			descending	:		return viewComparator(viewB, viewA, function(model, view){ return model && model.get('someTextField') });
			multiple compares: 	return viewComparator([[viewB, viewA, func], [viewB, viewA, func]])
*/
var viewComparator = function viewComparator() {
	for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
		args[_key] = arguments[_key];
	}

	var compareArray = [];
	var result = 0;

	if (args.length >= 2) // single compare
		return compareAB.apply(null, args);else if (args.length === 1 && args[0] instanceof Array) // array of compare
		compareArray = args[0];

	_(compareArray).every(function (singleCompare) {
		result = compareAB.apply(null, singleCompare);
		return result === 0;
	});

	return result;
};

var view = { compareAB: compareAB, viewComparator: viewComparator };

var Functions = { view: view };

var knownCtors = [Bb.Model, Bb.Collection, Bb.View, Bb.Router, Mn.Object];

function isKnownCtor(arg) {
	var isFn = _.isFunction(arg);
	var result = _(knownCtors).some(function (ctor) {
		return arg === ctor || arg.prototype instanceof ctor;
	});
	return isFn && result;
}

var YatError = Mn.Error.extend({}, {
	Http400: function Http400(message) {
		return this.Http(400, message);
	},
	Http401: function Http401(message) {
		return this.Http(401, message);
	},
	Http403: function Http403(message) {
		return this.Http(403, message);
	},
	Http404: function Http404(message) {
		return this.Http(404, message);
	},
	Http500: function Http500(message) {
		return this.Http(500, message);
	},
	Http: function Http(status, message) {
		var error = new this({ message: message, name: "HttpError" });
		error.status = status;
		return error;
	},
	NotFound: function NotFound(message) {
		return this.Http404(message);
	},
	NotAuthorized: function NotAuthorized(message) {
		return this.Http401(message);
	},
	Forbidden: function Forbidden(message) {
		return this.Http403(message);
	}
});

function smartExtend(Src, Dst) {
	if (_.isFunction(Dst)) {
		return Dst(Src);
	} else if (_.isObject(Dst)) {
		return Src.extend(Dst);
	} else throw new YatError('Mixin fail, argument should be an object hash or mixin function');
}

function mix(BaseClass) {
	var Mixed = null;
	if (_.isFunction(BaseClass)) {
		Mixed = BaseClass;
	} else if (_.isObject(BaseClass) && BaseClass !== null) {
		var tmp = function tmp() {};
		tmp.extend = Mn.extend;
		Mixed = tmp.extend(BaseClass);
	} else {
		throw new Error('argument should be an object or class definition');
	}
	if (!Mixed.extend) {
		Mixed = Mn.extend.call(BaseClass, {});
		Mixed.extend = Mn.extend;
	}
	var fake = {
		with: function _with() {
			for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
				args[_key] = arguments[_key];
			}

			return _.reduce(args, function (memo, arg) {
				return smartExtend(memo, arg);
			}, Mixed);
		},
		class: Mixed
	};
	return fake;
}

var Helpers = {
	isKnownCtor: isKnownCtor,
	mix: mix
};

function GetNameLabel (Base) {
	return Base.extend({
		getName: function getName() {
			return this.getProperty('name') || this.id || this.cid;
		},
		getLabel: function getLabel() {
			return this.getProperty('label') || this.getName();
		}
	});
}

var GetOptionProperty = (function (Base) {
	var Mixin = Base.extend({
		//property first approach
		getProperty: function getProperty(key, options) {
			return this._getOptionOrProperty(this, key, options, this.getOption);
		},

		//options first approach
		getOption: function getOption(key, options) {
			return this._getOptionOrProperty(this.getProperty('options', { deep: false }), key, options, this.getProperty);
		},
		_getOptionOrProperty: function _getOptionOrProperty(valueContext, key) {
			var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
			var fallback = arguments[3];

			options.deep !== undefined || (options.deep = true);
			options.force !== undefined || (options.force = true);
			options.args || (options.args = []);

			//key and valueContext should be passed
			if (key == null || valueContext == null) return;

			//getting raw value
			var value = valueContext[key];

			//if there is no raw value and deep option is true then getting value from fallback
			if (value === undefined && options.deep && _.isFunction(fallback)) {
				var fallbackOptions = _.extend({}, options, { deep: false, force: false });
				value = fallback.call(this, key, fallbackOptions);
			}

			//if returned value is function and is not any of known constructors and options property force set to true 
			//we should return value of that function
			//options.args will be passed as arguments
			if (_.isFunction(value) && options.force && !isKnownCtor(value)) value = value.apply(this, options.args || []);

			//console.log('key', key, value);

			//if value is still undefined we will return default option value
			return value === undefined ? options.default : value;
		}
	});
	return Mixin;
});

var RadioMixin = (function (Base) {
	var Mixin = Base.extend({
		constructor: function constructor() {
			for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
				args[_key] = arguments[_key];
			}

			Base.apply(this, args);
			var initRadioOnInitialize = !(this.getProperty('initRadioOnInitialize') === true);
			this._initRadio({ skip: initRadioOnInitialize });
		},
		getChannel: function getChannel() {
			if (!this._channel) this._initRadio({ skip: false });
			return this._channel;
		},
		_initRadio: function _initRadio() {
			var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { skip: true };

			if (opts.skip == true) return;

			var channelName = this.getProperty('channelName');
			if (!channelName) {
				var channel = this.getProperty('channel');
				if (channel) this.channelName = channel.channelName;
			}
			Mn.Object.prototype._initRadio.call(this);
		},
		radioRequest: function radioRequest() {
			var channel = this.getChannel();
			if (channel) channel.request.apply(channel, arguments);
		},
		radioTrigger: function radioTrigger() {
			var channel = this.getChannel();
			if (channel) channel.trigger.apply(channel, arguments);
		}
	});

	return Mixin;
});

var Stateable = (function (BaseClass) {
	var Mixin = BaseClass.extend({
		constructor: function constructor() {
			for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
				args[_key] = arguments[_key];
			}

			BaseClass.apply(this, args);
			this.initializeStateable();
		},
		initializeStateable: function initializeStateable() {
			this._state = {};
		},
		getState: function getState(key) {
			var state = this._state;
			if (!key) return state;else return state[key];
		},
		setState: function setState(key, value, options) {

			if (key == null) return;

			if (_.isObject(key)) {
				var _this = this;
				options = value;
				value = key;
				_(value).each(function (propertyValue, propertyName) {
					return _this.setState(propertyName, propertyValue, options);
				});
				this._triggerStateChange(value, options);
			} else {
				var state = this.getState();
				state[key] = value;
				this._triggerStateChange(key, value, options);
			}
		},
		clearState: function clearState() {
			var state = this.getState();
			var broadcast = _.extend({}, state);
			_(state).each(function (s, key) {
				broadcast[key] = undefined;
				delete state[key];
			});
			this._triggerStateChange(broadcast);
		},
		_triggerStateChange: function _triggerStateChange(key, value, options) {

			if (!_.isFunction(this.triggerMethod)) return;

			if (!_.isObject(key)) {
				this.triggerMethod('state:' + key, value, options);
				if (value === true || value === false) this.triggerMethod('state:' + key + ':' + value.toString(), options);
			} else {
				//key is a hash of states
				//value is options
				options = value;
				value = key;
				this.triggerMethod('state', value, options);
			}
		}
	});
	Mixin.Stateable = true;

	return Mixin;
});

var STATES = {
	INITIALIZED: 'initialized',
	STARTING: 'starting',
	RUNNING: 'running',
	STOPPING: 'stopping',
	WAITING: 'waiting',
	DESTROYED: 'destroyed'
};

var STATE_KEY = 'life';

function getPropertyPromise(context, propertyName) {
	var _this = this;

	var rawPromises = context[propertyName] || [];
	var promises = [];
	_(rawPromises).each(function (promiseArg) {
		if (_.isFunction(promiseArg)) promises.push(promiseArg.call(_this));else promises.push(promiseArg);
	});
	return Promise.all(promises);
}

function addPropertyPromise(context, propertyName, promise) {
	context[propertyName] || (context[propertyName] = []);
	var promises = context[propertyName];
	promises.push(promise);
}

var Startable = (function (Base) {
	var Middle = mix(Base).with(Stateable);
	var Mixin = Middle.extend({
		constructor: function constructor() {
			for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
				args[_key] = arguments[_key];
			}

			Middle.apply(this, args);
			this.initializeStartable();
		},
		initializeStartable: function initializeStartable() {

			if (!(this.constructor.Startable && this.constructor.Stateable)) return;

			this._registerStartableLifecycleListeners();
			this._setLifeState(STATES.INITIALIZED);
		},
		start: function start() {
			var _this2 = this;

			for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
				args[_key2] = arguments[_key2];
			}

			var options = args[0];
			var canNotBeStarted = this._ensureStartableCanBeStarted();
			var resultPromise = null;
			var catchMethod = null;

			if (canNotBeStarted) {
				catchMethod = function catchMethod() {
					return _this2.triggerMethod('start:decline', canNotBeStarted);
				};
				resultPromise = Promise.reject(canNotBeStarted);
			}

			if (resultPromise == null) {
				var declineReason = this.isStartNotAllowed(options);
				if (declineReason) {
					catchMethod = function catchMethod() {
						return _this2.triggerMethod('start:decline', declineReason);
					};
					//this.triggerMethod('start:decline', declineReason);
					resultPromise = Promise.reject(declineReason);
				}
			}

			if (resultPromise == null) {
				var currentState = this._getLifeState();
				this._tryMergeStartOptions(options);
				this.triggerMethod.apply(this, ['before:start'].concat(args));
				resultPromise = this._getStartPromise();
			}

			return resultPromise.then(function () {
				_this2.triggerStart(options);
			}, function (error) {
				_this2._setLifeState(currentState);
				if (catchMethod) catchMethod();
				return Promise.reject(error);
			});
		},
		triggerStart: function triggerStart(options) {
			this.triggerMethod('start', options);
		},
		stop: function stop(options) {
			var _this3 = this;

			var canNotBeStopped = this._ensureStartableCanBeStopped();
			if (canNotBeStopped) {
				this.triggerMethod('stop:decline', canNotBeStopped);
				return Promise.reject(canNotBeStopped);
			}
			var declineReason = this.isStopNotAllowed(options);
			if (declineReason) {
				this.triggerMethod('stop:decline', declineReason);
				return Promise.reject(declineReason);
			}

			var currentState = this._getLifeState();

			this._tryMergeStopOptions(options);
			this.triggerMethod('before:stop', this, options);

			var promise = this._getStopPromise();

			return promise.then(function () {
				_this3.triggerStop(options);
			}, function () {
				_this3._setLifeState(currentState);
			});
		},
		triggerStop: function triggerStop(options) {
			this.triggerMethod('stop', options);
		},
		isStartNotAllowed: function isStartNotAllowed() {},
		isStopNotAllowed: function isStopNotAllowed() {},
		addStartPromise: function addStartPromise(promise) {
			addPropertyPromise(this, 'startPromises', promise);
		},
		addStopPromise: function addStopPromise(promise) {
			addPropertyPromise(this, 'stopPromises', promise);
		},


		//lifecycle state helpers
		_setLifeState: function _setLifeState(newstate) {
			this.setState(STATE_KEY, newstate);
		},
		_getLifeState: function _getLifeState() {
			return this.getState(STATE_KEY);
		},
		_isLifeState: function _isLifeState(state) {
			return this._getLifeState() === state;
		},
		_isLifeStateIn: function _isLifeStateIn() {
			var _this4 = this;

			for (var _len3 = arguments.length, states = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
				states[_key3] = arguments[_key3];
			}

			return _(states).some(function (state) {
				return _this4._isLifeState(state);
			});
		},
		_isInProcess: function _isInProcess() {
			return this._isLifeStateIn(STATES.STARTING, STATES.STOPPING);
		},
		_registerStartableLifecycleListeners: function _registerStartableLifecycleListeners() {
			var _this5 = this;

			this.on('before:start', function () {
				return _this5._setLifeState(STATES.STARTING);
			});
			this.on('start', function () {
				return _this5._setLifeState(STATES.RUNNING);
			});
			this.on('before:stop', function () {
				return _this5._setLifeState(STATES.STOPPING);
			});
			this.on('stop', function () {
				return _this5._setLifeState(STATES.WAITING);
			});
			this.on('destroy', function () {
				return _this5._setLifeState(STATES.DESTROYED);
			});
		},
		_tryMergeStartOptions: function _tryMergeStartOptions(options) {
			if (!this.mergeOptions) return;
			var mergeoptions = this.getProperty('mergeStartOptions') || [];
			this.mergeOptions(options, mergeoptions);
		},
		_tryMergeStopOptions: function _tryMergeStopOptions(options) {
			if (!this.mergeOptions) return;
			var mergeoptions = this.getProperty('mergeStopOptions') || [];
			this.mergeOptions(options, mergeoptions);
		},
		_ensureStartableIsIntact: function _ensureStartableIsIntact() {
			var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { throwError: false };

			var message = 'Startable has already been destroyed and cannot be used.';
			var error = new YatError({
				name: 'StartableLifecycleError',
				message: message
			});
			var destroyed = this._isLifeState(STATES.DESTROYED);
			if (opts.throwError && destroyed) {
				throw error;
			} else if (destroyed) {
				return error;
			}
		},
		_ensureStartableIsIdle: function _ensureStartableIsIdle() {
			var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { throwError: false };

			var message = 'Startable is not idle. current state: ' + this._getLifeState();
			var error = new YatError({
				name: 'StartableLifecycleError',
				message: message
			});
			var isNotIntact = this._ensureStartableIsIntact(opts);
			var notIdle = this._isInProcess();
			if (opts.throwError && notIdle) {
				throw error;
			} else if (isNotIntact) {
				return isNotIntact;
			} else if (notIdle) {
				return error;
			}
		},
		_ensureStartableCanBeStarted: function _ensureStartableCanBeStarted() {
			var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { throwError: false };


			var message = 'Startable has already been started.';
			var error = new YatError({
				name: 'StartableLifecycleError',
				message: message
			});
			var notIdle = this._ensureStartableIsIdle(opts);
			var allowStartWithoutStop = this.getProperty('allowStartWithoutStop') === true;

			if (!notIdle && allowStartWithoutStop) return;

			var running = this._isLifeState(STATES.RUNNING);
			if (opts.throwError && running) {
				throw error;
			} else if (notIdle) {
				return notIdle;
			} else if (running) {
				return error;
			}
		},
		_ensureStartableCanBeStopped: function _ensureStartableCanBeStopped() {
			var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { throwError: false };


			var message = 'Startable should be in `running` state.';
			var error = new YatError({
				name: 'StartableLifecycleError',
				message: message
			});
			var notIdle = this._ensureStartableIsIdle(opts);

			var allowStopWithoutStart = this.getProperty('allowStopWithoutStart') === true;
			if (!notIdle && allowStopWithoutStart) return;

			var running = this._isLifeState(STATES.RUNNING);

			if (opts.throwError && !running) {
				throw error;
			} else if (notIdle) {
				return notIdle;
			} else if (!running) {
				return error;
			}
		},
		_getStartPromise: function _getStartPromise() {
			return Promise.all(this._getStartPromises());
		},
		_getStartPromises: function _getStartPromises() {
			var promises = [];
			promises.push(this._getStartUserPromise());
			promises.push(this._getStartParentPromise());
			return promises;
		},
		_getStartUserPromise: function _getStartUserPromise() {
			return getPropertyPromise(this, 'startPromises');
		},
		_getStartParentPromise: function _getStartParentPromise() {
			var parent = _.result(this, 'getParent');
			if (_.isObject(parent) && _.isFunction(parent._getStartPromise)) return parent._getStartPromise();
		},
		_getStopPromise: function _getStopPromise() {
			return Promise.all(this._getStopPromises());
		},
		_getStopPromises: function _getStopPromises() {
			var promises = [];
			promises.push(this._getStopUserPromise());
			return promises;
		},
		_getStopUserPromise: function _getStopUserPromise() {
			return getPropertyPromise(this, 'stopPromises');
		},
		_getStopParentPromise: function _getStopParentPromise() {
			var parent = _.result(this, 'getParent');
			if (_.isObject(parent) && _.isFunction(parent._getStopPromise)) return parent._getStartPromise();
		}
	});

	Mixin.Startable = true;

	return Mixin;
});

var Childrenable = (function (Base) {

	var CHILDREN_FIELD = '_children';

	var Mixin = Base.extend({
		constructor: function constructor() {
			for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
				args[_key] = arguments[_key];
			}

			Base.apply(this, args);
			this.initializeChildrenable.apply(this, args);
		},
		initializeChildrenable: function initializeChildrenable() {
			var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

			this._initializeParrent(options);
			this._initializeChildren(options);
		},
		hasChildren: function hasChildren() {
			var children = this.getChildren();
			return this[CHILDREN_FIELD].length > 0;
		},
		getChildren: function getChildren() {
			var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { startable: true };

			var all = this[CHILDREN_FIELD] || [];
			if (!opts.startable) {
				return all;
			} else {
				return all.filter(function (c) {
					return !c.getProperty('isStartNotAllowed');
				});
			}
		},
		hasParent: function hasParent() {
			var parent = this.getParent();
			return _.isObject(parent);
		},
		getParent: function getParent() {
			return this.getProperty('parent', { deep: false });
		},
		_initializeChildren: function _initializeChildren() {
			var _this = this;

			var _children = this.getProperty('children');
			var children = [];
			_(_children).each(function (child) {

				var childContext = _this._normalizeChildContext(child);
				var initialized = _this._initializeChild(childContext);
				if (initialized) children.push(initialized);
			});
			this[CHILDREN_FIELD] = children;
		},
		_initializeChild: function _initializeChild(childContext) {
			if (childContext == null || !_.isFunction(childContext.Child)) return;

			var Child = childContext.Child;
			var opts = this._normalizeChildOptions(childContext);
			return this.buildChild(Child, opts);
		},
		_normalizeChildContext: function _normalizeChildContext(child) {
			var childContext = {};

			if (_.isFunction(child) && child.Childrenable) {
				_.extend(childContext, { Child: child });
			} else if (_.isFunction(child)) {
				childContext = this._normalizeChildContext(child.call(this));
			} else if (_.isObject(child)) {
				childContext = child;
			}
			return childContext;
		},
		_normalizeChildOptions: function _normalizeChildOptions(options) {
			var opts = _.extend({}, options);
			if (this.getOption('passToChildren') === true) {
				_.extend(opts, this.options);
			}
			opts.parent = this;
			delete opts.Child;
			return this._buildChildOptions(opts);
		},


		_buildChildOptions: function _buildChildOptions(def) {
			return _.extend(def, this.getProperty('childOptions'));
		},

		buildChild: function buildChild(ChildClass, options) {
			return new ChildClass(options);
		},
		_initializeParrent: function _initializeParrent(opts) {
			if (this.parent == null && opts.parent != null) this.parent = opts.parent;
		}
	});

	Mixin.Childrenable = true;

	return Mixin;
});

var Mixins = {
	GetNameLabel: GetNameLabel,
	GetOptionProperty: GetOptionProperty,
	Radioable: RadioMixin,
	Stateable: Stateable,
	Startable: Startable,
	Childrenable: Childrenable
};

var DragAndDropSingleton = Mn.Object.extend({
	name: 'draggable manager',
	buildDraggableContext: function buildDraggableContext($el, beh, event) {
		var context = {
			id: _.uniqueId('draggable'),
			state: 'pending',
			$trigger: $el,
			scope: beh.getOption("scope") || "default",
			behavior: beh,
			view: beh.view,
			model: beh.view.model,
			mouse: {
				startAt: { x: event.pageX, y: event.pageY }
			},
			_documentHandlers: {},
			_triggerHandlers: {},
			_elementHandlers: {}
		};

		context.mouse.getOffset = function (ev) {
			var res = {
				x: ev.pageX - this.startAt.x,
				y: ev.pageY - this.startAt.y
			};
			res.absX = Math.abs(res.x);
			res.absY = Math.abs(res.y);
			res.distance = Math.round(Math.sqrt(res.absX * res.absX + res.absY * res.absY));
			return res;
		};

		context._documentHandlers.mousemove = _.bind(this.__documentMouseMoveHandler, this, $el, context);
		context._documentHandlers.mouseup = _.bind(this.__documentMouseUpHandler, this, $el, context);
		context._documentHandlers.mouseleave = _.bind(this.__documentMouseLeaveHandler, this, $el, context);
		context._documentHandlers.mouseenter = _.bind(this.__documentMouseEnterHandler, this, $el, context);

		context._elementHandlers.dragover = _.bind(this.__dragOverHandler, this, $el, context);

		return context;
	},
	setupDraggable: function setupDraggable($el, behavior) {
		if (!$el.jquery && !(typeof $el === 'string')) throw new Error('first argument should be jquery element or string selector');
		if (!(behavior instanceof Mn.Behavior)) throw new Error('second argument should be marionette behavior instance');

		var $handler = $el.jquery ? $el : behavior.$el;
		var selector = typeof $el === 'string' ? $el : null;

		$handler.on('mousedown', selector, null, _.bind(this.__triggerMouseDownHandler, this, $handler, behavior));
	},
	__triggerMouseDownHandler: function __triggerMouseDownHandler($el, behavior, ev) {

		ev.preventDefault();
		ev.stopPropagation();

		var context = this.buildDraggableContext($el, behavior, ev);

		$(document).on('mousemove', null, null, context._documentHandlers.mousemove);
		$(document).one('mouseup', null, null, context._documentHandlers.mouseup);

		return false;
	},
	__documentMouseUpHandler: function __documentMouseUpHandler($el, context, ev) {
		if (context.state === 'pending') {
			//dragging do not occurs
		} else if (context.state === "dragging") {
			context.state = 'dropped';
			context.view.triggerMethod('drag:end', context);
			$(ev.target).trigger('drag:drop', context);
		}

		this._clearAllHandlers($el, context);
	},

	__documentMouseMoveHandler: function __documentMouseMoveHandler($el, context, ev) {
		if (context.state === 'pending') {
			var startDistance = context.behavior.getOption('startDragOnDistance') || 1;
			var distance = context.mouse.getOffset(ev).distance;
			if (distance < startDistance) return;

			this._initializeDragging($el, context, ev);
		}

		if (context.state === 'dragging') context.view.triggerMethod('drag', ev, context);
	},

	_initializeDragging: function _initializeDragging($el, context, ev) {
		if (context.state === 'dragging') return;

		context.state = 'dragging';
		context.view.triggerMethod('drag:start', ev, context);

		$(document).on('mouseleave', '*', null, context._documentHandlers.mouseleave);
		$(document).on('mouseenter', '*', null, context._documentHandlers.mouseenter);
	},

	__documentMouseLeaveHandler: function __documentMouseLeaveHandler($el, context, ev) {
		if ($.contains(context.view.$el.get(0), ev.target)) return;

		$(ev.target).trigger('drag:leave', context);
	},
	__documentMouseEnterHandler: function __documentMouseEnterHandler($el, context, ev) {
		if (context.$entered) {
			context.$entered.off('mousemove', null, context._elementHandlers.dragover);
		}
		var same = $.contains(context.view.$el.get(0), ev.target);
		if (same) return;

		var event = this._createCustomDomEvent("drag:enter", ev);
		context.$entered = $(ev.target);
		context.$entered.trigger(event, context);

		context.$entered.on('mousemove', null, null, context._elementHandlers.dragover);
	},

	__dragOverHandler: function __dragOverHandler($el, context, ev) {
		var event = this._createCustomDomEvent("drag:over", ev);
		$(ev.target).trigger(event, context);
	},

	_createCustomDomEvent: function _createCustomDomEvent(name, event, merge) {
		if (!merge) merge = ["pageX", "pageY", "clientX", "clientY", "offsetX", "offsetY"];

		var customEvent = jQuery.Event(name);
		_(merge).each(function (prop) {
			customEvent[prop] = event[prop];
		});

		return customEvent;
	},

	_clearAllHandlers: function _clearAllHandlers($el, context) {
		var $doc = $(document);
		_(context._documentHandlers).each(function (handler, name) {
			$doc.off(name, null, handler);
		});
		_(context._triggerHandlers).each(function (handler, name) {
			$el.off(name, null, handler);
		});

		if (context.$entered) {
			context.$entered.off('mousemove', null, context._elementHandlers.dragover);
		}
	}
});

var dragAndDrop = new DragAndDropSingleton();

var DraggableBehavior = Mn.Behavior.extend({

	startDragOnDistance: 50,

	events: {
		'dragged:over': '_dragOver'
	},
	_dragOver: function _dragOver(event, part, context) {
		event.stopPropagation();
		event.preventDefault();

		if (this.wrongScope(context)) return;
		this.view.triggerMethod('dragged:over', part, context, this);
		this.view.triggerMethod('dragged:over:' + part, context, this);
	},
	onInitialize: function onInitialize() {
		this._setup();
	},
	getScope: function getScope() {
		return this.getOption("scope") || "default";
	},
	wrongScope: function wrongScope(context) {
		return this.getScope() !== context.scope;
	},
	onDragStart: function onDragStart(ev, context) {

		var ghost = this.getOption('ghost') || "clone";

		if (ghost == 'clone') {
			var $g = this.$ghost = this.$el.clone();
			$g.css({
				top: ev.pageY + 'px',
				left: ev.pageX + 'px',
				width: this.$el.width()
			});

			if (this.getOption('elementClass')) this.$el.addClass(this.getOption('elementClass'));
			if (this.getOption('ghostClass')) $g.addClass(this.getOption('ghostClass'));

			var $dragContext = $('body');
			var ghostContext = this.getOption('ghostContext');
			var $dragContext = ghostContext == null ? $('body') : ghostContext == "parent" ? this.$el.parent() : $(ghostContext);
			$g.appendTo($dragContext);
		}
	},
	onDrag: function onDrag(ev) {
		if (!this.$ghost) return;
		this.$ghost.css({
			top: ev.pageY + 'px',
			left: ev.pageX + 'px'
		});
	},
	onDragEnd: function onDragEnd() {

		if (this.$ghost) this.$ghost.remove();

		if (this.getOption('elementClass')) this.$el.removeClass(this.getOption('elementClass'));
	},
	getDragTrigger: function getDragTrigger() {
		if (this.getOption('dragTrigger')) return this.getOption('dragTrigger');

		return this.$el;
	},
	_setup: function _setup() {
		dragAndDrop.setupDraggable(this.getDragTrigger(), this);
	}
});

var SortByDrag = Mn.Behavior.extend({
	events: {
		'drag:drop': '_dragDrop',
		'drag:over': '_dragOver'
	},
	_dragOver: function _dragOver(ev, context) {
		if (this.wrongScope(context)) return;
		ev.stopPropagation();
		ev.preventDefault();

		if (ev.target === this.$el.get(0)) {
			this._insert(context);
			return;
		}

		var oldpos = this.dragOverPosition || '';
		var m = { y: ev.pageY, x: ev.pageX };
		var $el = this.getChildEl(ev.target);
		var position = "top:left";
		if ($el.length) {
			var i = this._get$elInfo($el);
			var hor = m.x < i.center.x ? 'left' : 'right';
			var ver = m.y < i.center.y ? 'top' : 'bottom';
			position = ver + ":" + hor;
		} else {
			console.warn(ev.target);
		}

		var dragBy = this.getOption("dragBy") || "both";
		if (oldpos != position) {
			var apos = oldpos.split(':');

			var eventContext = $el;
			if (dragBy == "both") {
				eventContext.trigger('dragged:over', [position, context]);
			}
			if (apos.indexOf(hor) === -1 && (dragBy === "horizontal" || dragBy === "both")) {
				eventContext.trigger('dragged:over', [hor, context]);
			}
			if (apos.indexOf(ver) == -1 && (dragBy === "vertical" || dragBy === "both")) {
				eventContext.trigger('dragged:over', [ver, context]);
			}
			this.dragOverPosition = position;
		}
	},
	_dragDrop: function _dragDrop(ev, context) {
		if (this.wrongScope(context)) return;
		ev.stopPropagation();
		ev.preventDefault();

		this._tryInsertBetween(context);
		return false;
	},
	_tryInsertBetween: function _tryInsertBetween(context) {

		var model = context.model;
		var view = context.view;

		if (!this.view.collection) {
			console.warn('collection not defined');
			return;
		}

		view.$el.detach();
		view.destroy();

		this.removeModelFromCollection(model);
		this.insertModelAt(model, context.insertAt);
	},
	removeModelFromCollection: function removeModelFromCollection(model) {
		var col = model.collection;
		if (!col) return;
		col.remove(model);
		delete model.collection;
		col.each(function (m, i) {
			m.set("order", i);
		});
	},
	insertModelAt: function insertModelAt(model, at) {
		var col = this.view.collection;
		if (!col) return;

		if (at <= 0) at = 0;

		if (at >= col.length) {
			model.set('order', col.length);
			model.collection = col;
			col.push(model);
		} else {
			model.set('order', at);
			model.collection = col;

			if (at > 0) col.add(model, { at: at });else col.unshift(model);

			col.each(function (exist, ind) {
				exist.set('order', ind);
			});
		}

		this.view.sort();
	},
	getScope: function getScope() {
		return this.getOption("scope") || "default";
	},
	wrongScope: function wrongScope(context) {
		return this.getScope() !== context.scope;
	},
	getChildEl: function getChildEl(el) {
		var selector = this.getOption('childSelector');
		return $(el).closest(selector);
	},
	_get$elInfo: function _get$elInfo($el, force) {
		var i = this._$elInfo = {
			size: { width: $el.width(), height: $el.height() },
			offset: $el.offset()
		};
		i.center = { x: i.size.width / 2 + i.offset.left, y: i.size.height / 2 + i.offset.top };
		return i;
	},
	getOrder: function getOrder(beh) {
		return beh.view.model.getOrder() || 0;
	},
	_updateInsert: function _updateInsert(context, order) {
		context.insertAt = order;
	},
	onChildviewDraggedOverLeft: function onChildviewDraggedOverLeft(context, childBeh) {
		this._insert(context, "insertBefore", childBeh);
	},
	onChildviewDraggedOverTop: function onChildviewDraggedOverTop(context, childBeh) {
		this._insert(context, "insertBefore", childBeh);
	},
	onChildviewDraggedOverRight: function onChildviewDraggedOverRight(context, childBeh) {
		this._insert(context, "insertAfter", childBeh);
	},
	onChildviewDraggedOverBottom: function onChildviewDraggedOverBottom(context, childBeh) {
		this._insert(context, "insertAfter", childBeh);
	},
	_insert: function _insert(context, method, childBeh) {
		var order = childBeh ? this.getOrder(childBeh) : 0;

		if (method) context.view.$el[method](childBeh.$el);else context.view.$el.appendTo(this.$el);

		this._updateInsert(context, order);
	}
});

var Behaviors = { Draggable: DraggableBehavior, SortByDrag: SortByDrag };

var Singletons = { dragAndDrop: dragAndDrop };

var YatObject = mix(Mn.Object).with(GetOptionProperty, RadioMixin);

var IDENTITY_CHANNEL = 'identity';

var Base = mix(YatObject).with(Stateable);
var YatUser = Base.extend({
	constructor: function constructor() {
		for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
			args[_key] = arguments[_key];
		}

		Base.apply(this, args);
		this._initializeYatUser();
	},
	_initializeYatUser: function _initializeYatUser() {},

	channelName: IDENTITY_CHANNEL,
	isAnonym: function isAnonym() {
		return !this.getState('id');
	},
	isUser: function isUser() {
		return !this.isAnonym();
	},
	isMe: function isMe(id) {
		return id && this.getState('id') === id;
	},
	update: function update(hash) {
		this.setState(hash);
		this.trigger('change');
	},
	logIn: function logIn(hash) {
		if (!hash.id) return;
		this.update(hash);
		this.trigger('log:in');
	},
	logOut: function logOut() {
		this.clearState();
		this.trigger('change');
		this.trigger('log:out');
	}
});
var user = new YatUser();

var Base$1 = mix(Mn.Application).with(GetOptionProperty, RadioMixin, Childrenable, Startable);

var App = Base$1.extend({

	initRadioOnInitialize: true,
	_initRegion: function _initRegion() {
		var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { skip: true };

		if (opts.skip) return;
		var region = this.getProperty('region');
		this.region = region;
		Base$1.prototype._initRegion();
	},
	getRegion: function getRegion() {
		if (!this._region) this._initRegion({ skip: false });
		return this._region;
	},
	addPageManager: function addPageManager(pageManager) {
		var _this = this;

		this._pageManagers || (this._pageManagers = []);
		this._pageManagers.push(pageManager);

		var prefix = pageManager.getName();
		if (!prefix) {
			console.warn('pageManager prefix not defined');
			return;
		}

		this.listenTo(pageManager, 'all', function (eventName) {
			for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
				args[_key - 1] = arguments[_key];
			}

			var prefixedEventName = prefix + ':' + eventName;
			_this.triggerMethod.apply(_this, [prefixedEventName].concat(args));
		});
	},
	hasPageManagers: function hasPageManagers() {
		return this._pageManagers && this._pageManagers.length > 0;
	},
	getMenuTree: function getMenuTree() {
		var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { rebuild: false };

		if (this._menuTree && !opts.rebuild) return this._menuTree;
		var managers = this._pageManagers || [];
		var links = _(managers).chain().map(function (manager) {
			return manager.getLinks();
		}).flatten().value();
		this._menuTree = new Bb.Collection(links);
		return this._menuTree;
	},
	getPage: function getPage(key) {
		if (!this.hasPageManagers()) return;
		return _(this._pageManagers).find(function (mngr) {
			return mngr.getPage(key);
		});
	}
});

var Router = Mn.AppRouter.extend({}, {
	create: function create(hash, context) {
		var _this = this;

		var appRoutes = {};
		var controller = {};
		_(hash).each(function (handlerContext, key) {
			appRoutes[key] = key;
			controller[key] = function () {
				handlerContext.action.apply(handlerContext, arguments).catch(function (error) {
					var commonEvent = 'error';
					var event = commonEvent + (error.status && ":" + error.status);
					if (event != commonEvent) context.triggerMethod(event, error, _this);

					context.triggerMethod(commonEvent, error, _this);
				});
			};
		});
		return new this({ controller: controller, appRoutes: appRoutes });
	}
});

var Model = Bb.Model.extend({});

var LinkModel = Model.extend({
	defaults: {
		url: undefined,
		label: undefined,
		target: '_self',
		level: 0
	},
	destroy: function destroy() {
		this.id = null;
		Model.prototype.destroy.apply(this, arguments);
	}
});

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

//import Radio from 'backbone.radio';
/* 
	YatPage
*/

var Base$2 = mix(App).with(GetNameLabel);

var YatPage = Base$2.extend({
	constructor: function constructor() {
		for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
			args[_key] = arguments[_key];
		}

		Base$2.apply(this, args);
		this.initializeYatPage();
	},


	allowStopWithoutStart: true,
	allowStartWithoutStop: true,

	initializeYatPage: function initializeYatPage(opts) {
		this.mergeOptions(opts, ["manager"]);
		this._initializeModels(opts);
		this._initializeRoute(opts);
		this._proxyEvents();
		this._tryCreateRouter();
		this._registerIdentityHandlers();
	},
	getLayout: function getLayout() {
		var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { rebuild: false };

		if (!this._layoutView || opts.rebuild || this._layoutView && this._layoutView.isDestroyed && this._layoutView.isDestroyed()) {
			this.buildLayout();
		}
		return this._layoutView;
	},
	buildLayout: function buildLayout() {
		var Layout = this.getProperty('Layout');
		if (Layout == null) return;
		var opts = _.extend({}, this.getProperty('layoutOptions'));

		if (this.model && !opts.model) _.extend(opts, { model: this.model });

		if (this.collection && !opts.collection) _.extend(opts, { collection: this.collection });

		var options = this.buildLayoutOptions(opts);
		options.page = this;
		this._layoutView = new Layout(options);
		return this._layoutView;
	},
	buildLayoutOptions: function buildLayoutOptions(rawOptions) {
		return rawOptions;
	},
	addModel: function addModel(model) {
		var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

		if (!model) return;
		this.model = model;
		var fetch = opts.fetch || this.getOption('fetchModelOnAdd');
		if (fetch === undefined) {
			fetch = this.getProperty('fetchDataOnAdd');
		}
		if (fetch === true) {
			this.addStartPromise(model.fetch(opts));
		}
	},
	addCollection: function addCollection(collection) {
		var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

		if (!collection) return;
		this.collection = collection;
		var fetch = opts.fetch || this.getOption('fetchCollectionOnAdd');
		if (fetch === undefined) {
			fetch = this.getProperty('fetchDataOnAdd');
		}
		if (fetch === true) {
			this.addStartPromise(collection.fetch(opts));
		}
	},
	getRouteHash: function getRouteHash() {

		var hashes = [{}, this._routeHandler].concat(this.getChildren({ startable: false }).map(function (children) {
			return children.getRouteHash();
		}));
		return _.extend.apply(_, _toConsumableArray(hashes));
	},
	hasRouteHash: function hasRouteHash() {
		return _.isObject(this.getRouteHash());
	},
	getLinkModel: function getLinkModel() {
		var level = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

		if (!this._canHaveLinkModel()) return;
		if (this._linkModel) return this._linkModel;

		var url = this.getRoute();
		var label = this.getLabel();
		var children = this._getSublinks(level);
		this._linkModel = new LinkModel({ url: url, label: label, level: level, children: children });

		return this._linkModel;
	},
	_canHaveLinkModel: function _canHaveLinkModel() {
		return !(this.getProperty('skipMenu') === true || !!this.getProperty('isStartNotAllowed'));
	},
	_destroyLinkModel: function _destroyLinkModel() {
		if (!this._linkModel) return;
		this._linkModel.destroy();
		delete this._linkModel;
	},
	getParentLinkModel: function getParentLinkModel() {
		var parent = this.getParent();
		if (!parent || !parent.getLinkModel) return;
		var model = parent.getLinkModel();
		return model;
	},
	getNeighbourLinks: function getNeighbourLinks() {
		var link = this.getLinkModel();
		if (link && link.collection) return link.collection;
	},
	_getSublinks: function _getSublinks(level) {
		var children = this.getChildren();
		if (!children || !children.length) return;
		var sublinks = _(children).chain().filter(function (child) {
			return child.getProperty("skipMenu") !== true;
		}).map(function (child) {
			return child.getLinkModel(level + 1);
		}).value();
		if (!sublinks.length) return;
		var col = new Bb.Collection(sublinks);
		return col;
	},
	_initializeModels: function _initializeModels() {
		var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

		this.addModel(opts.model, opts);
		this.addCollection(opts.collection, opts);
	},
	_initializeRoute: function _initializeRoute() {
		var route = this.getRoute({ asPattern: true });
		if (route == null) return;
		var page = this;
		this._routeHandler = _defineProperty({}, route, { context: page, action: function action() {
				return page.start.apply(page, arguments);
			} });
	},
	getRoute: function getRoute() {
		var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { asPattern: false };

		var relative = this.getProperty('relativeRoute');
		var route = this.getProperty('route');
		var parent = this.getParent();
		if (route == null) return;

		var result = route;

		if (relative && parent && parent.getRoute) {
			var parentRoute = parent.getRoute();
			result = parentRoute + '/' + route;
		}

		return this._normalizeRoute(result, opts);
	},
	_normalizeRoute: function _normalizeRoute(route, opts) {
		route = route.replace(/\/+/gmi, '/').replace(/^\//, '');
		if (opts.asPattern) {
			return route;
		} else {
			var res = route.replace(/\(\/\)/gmi, '/').replace(/\/+/gmi, '/');
			return res;
		}
	},
	_tryCreateRouter: function _tryCreateRouter() {
		var create = this.getProperty('createRouter') === true;
		if (create) {
			this.router = this._createAppRouter();
		}
	},
	_createAppRouter: function _createAppRouter() {
		var hash = this.getRouteHash();
		if (!_.size(hash)) return;
		return new Router(hash);
	},
	_proxyEvents: function _proxyEvents() {
		var proxyContexts = this._getProxyContexts();
		this._proxyEventsTo(proxyContexts);
	},
	_getProxyContexts: function _getProxyContexts() {
		var rdy = [];
		var manager = this.getProperty('manager');
		if (manager) {
			rdy.push({ context: manager });
		}
		var radio = this.getChannel();
		if (radio) {
			var allowed = this.getProperty('proxyEventsToRadio');
			rdy.push({ context: radio, allowed: allowed });
		}
		return rdy;
	},
	_proxyEventsTo: function _proxyEventsTo(contexts) {
		var all = [];
		var eventsHash = {};

		_(contexts).each(function (context) {
			if (!context.allowed) all.push(context.context);else {
				_(context.allowed).each(function (allowed) {
					eventsHash[allowed] || (eventsHash[allowed] = []);
					eventsHash[allowed].push(context.context);
				});
			}
		});
		var page = this;
		page.on('all', function (eventName) {
			for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
				args[_key2 - 1] = arguments[_key2];
			}

			var contexts = eventName in eventsHash ? eventsHash[eventName] : all;
			var triggerArguments = [page].concat(args);
			_(contexts).each(function (context) {
				return context.triggerMethod.apply(context, ['page:' + eventName].concat(_toConsumableArray(triggerArguments)));
			});
		});
	},


	_buildChildOptions: function _buildChildOptions(def) {
		var add = {};
		var manager = this.getProperty('manager');
		if (manager) add.manager = manager;
		return _.extend(def, this.getProperty('childOptions'), add);
	},

	_registerIdentityHandlers: function _registerIdentityHandlers() {
		var _this = this;

		this.listenTo(user, 'change', function () {
			for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
				args[_key3] = arguments[_key3];
			}

			_this._destroyLinkModel();
			_this.triggerMethod.apply(_this, ['identity:change'].concat(args));
		});
	}
});

var Base$3 = mix(App).with(GetNameLabel);

var YatPageManager = Base$3.extend({
	constructor: function constructor() {
		for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
			args[_key] = arguments[_key];
		}

		Base$3.apply(this, args);
		this._initializeYatPageManager.apply(this, args);
	},
	createRouter: function createRouter() {
		var children = this.getChildren({ startable: false });
		var hash = {};
		_(children).each(function (page) {
			if (_.isFunction(page.getRouteHash)) {
				_.extend(hash, page.getRouteHash());
			}
		});
		this._routesHash = hash;
		this.setRouter(Router.create(hash, this));
	},
	setRouter: function setRouter(router) {
		this.router = router;
	},
	getRouter: function getRouter() {
		return this.router;
	},
	getLinks: function getLinks() {
		var children = this.getChildren();
		if (!children) return;
		return _(children).chain().map(function (child) {
			return child.getLinkModel();
		}).filter(function (child) {
			return !!child;
		}).value();
	},
	navigate: function navigate(url) {
		var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : { trigger: true };


		var router = this.getRouter();
		if (router) router.navigate(url, opts);else console.warn('router not found');
	},
	getPage: function getPage(key) {

		var found = _(this._routesHash).find(function (pageContext, route) {
			if (route === key) return true;
			if (pageContext.context.getName() === key) return true;
		});
		return found && found.context;
	},
	navigateToRoot: function navigateToRoot() {
		var current = this.getState('currentPage');
		var rootUrl = this.getProperty('rootUrl');
		if (!rootUrl) {
			var children = this.getChildren();
			if (children && children.length) {
				var root = children.find(function (child) {
					return child != current;
				});
				rootUrl = root && root.getRoute();
			}
		}
		if (rootUrl != null) this.navigate(rootUrl);else console.warn('root page not found');
	},
	_initializeYatPageManager: function _initializeYatPageManager() {
		var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

		this.mergeOptions(opts, ['id', 'name', 'label']);
		this._registerPageHandlers(opts);
		this._registerIdentityHandlers();
		this.createRouter();
	},


	_buildChildOptions: function _buildChildOptions(def) {
		return _.extend(def, this.getProperty('childOptions'), {
			manager: this
		});
	},

	_registerPageHandlers: function _registerPageHandlers() {
		this.on('page:before:start', this._pageBeforeStart);
		this.on('page:start', this._pageStart);
		this.on('page:decline', this._pageDecline);
	},
	_pageBeforeStart: function _pageBeforeStart(page) {
		var current = this.getState('currentPage');
		if (current && current != page) {
			current.stop();
		}
	},
	_pageStart: function _pageStart(page) {
		this.setState('currentPage', page);
	},
	_pageDecline: function _pageDecline() {
		for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
			args[_key2] = arguments[_key2];
		}

		console.log("decline", args);
	},
	_registerIdentityHandlers: function _registerIdentityHandlers() {
		var _this = this;

		this.listenTo(user, 'change', function () {
			for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
				args[_key3] = arguments[_key3];
			}

			_this.triggerMethod.apply(_this, ['identity:change'].concat(args));
			_this._moveToRootIfCurrentPageNotAllowed();
		});
	},
	_moveToRootIfCurrentPageNotAllowed: function _moveToRootIfCurrentPageNotAllowed() {
		var current = this.getState('currentPage');
		if (!current || !current.isStartNotAllowed()) return;

		this.navigateToRoot();
	}
});

var marionetteYat = {
	VERSION: version,
	Functions: Functions,
	Helpers: Helpers,
	Mixins: Mixins,
	Behaviors: Behaviors,
	Singletons: Singletons,
	Object: YatObject,
	Error: YatError,
	App: App,
	Page: YatPage,
	Router: Router,
	PageManager: YatPageManager,
	identity: user
};

export default marionetteYat;
//# sourceMappingURL=marionette.yat.esm.js.map
