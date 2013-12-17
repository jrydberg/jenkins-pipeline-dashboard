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

App.Dashboard = {};

App.Dashboard._VersionView = Backbone.View.extend({
    template: _.template($('#version-template').html()),
    className: "pipeline-version",

    initialize: function() {
	this.listenTo(this.model, 'change', this.render);
    },

    render: function() {
	var data = this.model.toJSON();
	
	var building = _.some(data.builds, function(build) {
	    return build ? build.building : false
	});

	data.clazz = building ? "progress-striped active" : "";
	data.changeSet = data.changeSet || {};
	data.changeSet.items = data.changeSet.items || [];

	_.each(data.builds, function(build) {
	    if (build) {
		var duration = moment().diff(build.timestamp);
		build.percent = (build.building
				 ? Math.min(100, (duration / build.estimatedDuration) * 100)
				 : 100);
		build.percent = Math.max(0, build.percent);
		build.width = build.percent / data.builds.length;
		build.clazz = (build.building
			       ? "progress-bar-info"
			       : (build.result == 'SUCCESS'
				  ? "progress-bar-success"
				  : "progress-bar-danger"));
	    }
	    data.clazz 
	});
	this.$el.html(this.template(data));
	return this;
    }
});

App.Dashboard.Dashboard = Backbone.View.extend({
    template: _.template($('#dashboard-template').html()),
    className: "dashboard",

    initialize: function(options) {
	// FIXME: move VersionCollection out and let it be this.model.
	this._collection = new App.Pipeline.VersionCollection(
	    [], {pipeline: this.model});
	this.listenTo(this._collection, 'add', this.addOne);
	this.listenTo(this._collection, 'reset', this.addAll);
    },

    addOne: function(model) {
	var view = new App.Dashboard._VersionView({model: model});
	this.$el.append(view.render().el);
    },

    addAll: function() {
	this.$el.empty();
	_.each(this._collection, this.addOne, this);
    },

    start: function() {
	var self = this;
	this._collection.fetch().then(function() {
	    setTimeout(function() { self.start() }, 3000);
	});
    },

    render: function() {
	this.start();
	this.$el.html(this.template());
	return this;
    }
});