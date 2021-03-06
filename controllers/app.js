var app
	, db = require(__dirname + "/../helpers/ndb");


app = function(kiel){
	var find_app = function(err,req,res,data,cb) {
			db._instance().collection('app',function(err,_collection){
				if(err) {
					kiel.response(req, res, {data : err}, 500);
					return;
				}
				_collection.find({_id:data.app_id}).toArray(function(err,d){
					if(err) {
						kiel.response(req, res, {data : err}, 500);
						return;
					}
					if(d.length === 1) {
						try{
							cb(req,res,d[0],data);
						} catch (err) {
							kiel.response(req, res, {data : err}, 500);
						}
					} else {
						kiel.response(req, res, {data : "Application Id does not exists."}, 500);
					}
				});
			});
		}
		, change_user_app_data = function(req,res,app,data) {
			var app_data
				, app_update = {};

			try {
				app_data = JSON.parse(data.app_data);
			} catch(err) {
				kiel.response(req, res, {data : err}, 500);
				console.log(err);
				return;
			}

			console.log(app_data);
			console.log(data);
			app_update['data_' + data.app_id] = app_data;
			//add here
			db._instance().collection('users',function(err,_collection){
				_collection.update({_id:data.user_id},{$set:app_update}, function (err) {
					if (err) {
						kiel.response(req, res, {data : "Failed to update user in db."}, 500);
					} else {
						kiel.response(req, res, {data : app_data}, 200);
					}
				});
			});

		};
	
	return {
		get : {
			app_info : function (req, res) {
				var rqrd = ['app_id','app_secret'],
					rst;

				if(!(rst = kiel.utils.required_fields(rqrd,req.get_args)).stat){
					console.log(rst);
					kiel.response(req, res, {data : "Missing fields ["+rst.field+']'}, 500);
					return;
				}

				db._instance().collection('app', function(err, _collection){
					_collection.find({_id: req.get_args.app_id, secret: req.get_args.app_secret}) 
						.toArray(function (err, app) {
						if (err) {
							kiel.response(req, res, {data : "Failed to update user in db."}, 500);
						} else {
							kiel.response(req, res, {data : app}, 200);
						}
					});
				});
			}
		},

		post : {
			own_app_data : function(req, res) {
				var rqrd = ['app_id','access_token','user_id','app_data'],
					rst;

					console.log(rqrd);
					console.log(req.post_args);
				if(!(rst = kiel.utils.required_fields(rqrd,req.post_args)).stat){
					console.log(rst);
					kiel.response(req, res, {data : "Missing fields ["+rst.field+']'}, 500);
					return;
				}
				kiel.utils.has_scopes(['self.edit'], ['admin.edit_all'], req.post_args.access_token, function(err, d, optional_d){
					if(err){ kiel.response(req, res, {data : err.message}, err.response_code); return; }	
					if ( req.post_args.user_id !== d.user_id && !optional_d ) {
						kiel.response(req, res, {data : "Invalid user_id for access_token!"}, 404);
						return;
					}
					find_app(null,req,res,req.post_args,change_user_app_data);
				});
				
			}
		}, 

		put : {
	
		},

		delete : {

		}
	}
}

module.exports = app;
