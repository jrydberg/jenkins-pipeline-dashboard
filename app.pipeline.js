/* Copyright 2013 Spotify, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

App.Pipeline = {};

App.Pipeline.Version = Backbone.Model.extend({
    idAttribute: "number",

    initialize: function(options) {
	this._pipeline = this.collection._pipeline;
    }
});

App.Pipeline.VersionCollection = Backbone.Collection.extend({
    model: App.Pipeline.Version,

    initialize: function(models, options) {
	this._pipeline = options.pipeline;
    },

    // Return URL for a JOB.
    _get: function(job) {
	// FIXME: we can probably do this in a better way.
	var url = App.base_url + "/job/" + job + "/api/json?tree=name,description,displayName,builds[id,number,timestamp,building,result,actions[causes[upstreamBuild,upstreamProject]],duration,estimatedDuration,changeSet[items[commitId,msg]]]";
	return $.get(url);
    },

    // Given a set of jobs create two maps: One for mapping a build to
    // downstream builds (reversing the information that exists in
    // job), and one map for job+number to build.
    _make_maps: function(jobs, downstream_map, build_map) {
	_.each(jobs, function(job) {
	    _.each(job.builds, function(build) {
		build_map[job.name + ':' + build.number] = _.extend(
		    {}, build, {name: job.name, description: job.description});
		_.each(build.actions || [], function(action) {
		    _.each(action.causes || [], function(cause) {
			if (cause.hasOwnProperty('upstreamBuild')) {
			    var key = cause.upstreamProject + ':' + cause.upstreamBuild;
			    downstream_map[key] = build.number;
			}
		    });
		});
	    });
	});
    },

    _make_version: function(job, steps, initial, downstream_map, build_map) {
	var numbers = _.reduce(steps, function(numbers, step) {
	    var key = step + ':' + numbers[numbers.length - 1];
	    numbers.push(downstream_map[key] || null);
	    return numbers;
	}, [initial.number]);

	numbers = numbers.slice(0, -1);

	var builds = _.map(_.zip(steps, numbers), function(step_number) {
	    var key = step_number[0] + ':' + step_number[1];
	    return build_map[key];
	});

	// Base attributes on the first job and first build.
	return _.extend({}, job, {'changeSet': initial.changeSet,
				  'builds': builds,
				  'timestamp': initial.timestamp,
				  'number': initial.number,
				  'steps': steps});
    },

    fetch: function(options) {
	var collection = this;
	var steps = this._pipeline.get("steps");

	options = options || {};
	options.collection = this;

	return $.when.apply($, _.map(steps, this._get, this)).then(function() {
	    // ugly magic to make when work with deferred lists.
	    var jobs = (steps.length == 1
			? arguments[0]
			: _.map(arguments, function(arg) { return arg[0]; }));
	    var downstream_map = {}, build_map = {};
	    var versions;
            var method = options.reset ? 'reset' : 'set';

	    collection._make_maps(jobs, downstream_map, build_map);
	    versions = _.map(jobs[0].builds, function(initial) {
		return collection._make_version(jobs[0], steps, initial,
						downstream_map, build_map);
	    }, this);
            collection[method](versions, options);
	});
    }
});

// Model for a pipeline.
//
// The `steps` attribute defines what makes up the pipeline.
App.Pipeline.Pipeline = Backbone.Model.extend({
    idAttribute: "name"
});

App.Pipeline.PipelineCollection = Backbone.Collection.extend({
    model: App.Pipeline.Pipeline,

    url: function() {
	return App.base_url + "/api/json?pretty=true&tree=jobs[name,description,downstreamProjects[name],upstreamProjects[name]]";
    },

    parse: function(response) {
	var upstreams = {};
	var downstreams = {};
	var map = {};
	var models = [];

	_.each(response.jobs, function(job) {
	    map[job.name] = job;
	    if (job.upstreamProjects) {
		if (upstreams[job.name] == undefined && job.upstreamProjects.length > 0) {
		    upstreams[job.name] = job.upstreamProjects[0].name;
		}
	    }
	    if (job.downstreamProjects) {
		if (downstreams[job.name] == undefined && job.downstreamProjects.length > 0) {
		    downstreams[job.name] = job.downstreamProjects[0].name;
		}
	    }
	});

	_.each(response.jobs, function(job) {
	    if (upstreams.hasOwnProperty(job.name)) {
		return;
	    }
	    
	    var next = job.name;
	    var steps = [];
	    while (next) {
		steps.push(next);
		if (downstreams[next] == undefined) {
		    break;
		}
		next = downstreams[next];
	    }
	    job.steps = steps;
	    models.push(job);
	});

	//console.log("PIPELINE");
	//console.log(models);

	//models = _.filter(models, function(model) {
	//    return model.steps.length > 2;
	//});
	return models;
    }
});
