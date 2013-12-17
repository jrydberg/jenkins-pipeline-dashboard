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

window.App = {};

App.base_url = "http://192.168.56.101:8080/https://jenkins-spoticloud.spotify.net";

App.Router = Backbone.Router.extend({
    routes: {
	"":                     "index",
	":name":                "dashboard",
    },

    initialize: function(options, chrome) {
	this.chrome = chrome;
    },

    index: function() {
	var pipelines = new App.Pipeline.PipelineCollection();
	pipelines.fetch();
    },

    dashboard: function(name) {
	var pipelines = new App.Pipeline.PipelineCollection();
	pipelines.fetch().done(function() {
	    var pipeline = pipelines.get(name);
	    App.chrome.show(new App.Dashboard.Dashboard({model: pipeline}).render());
	});
    },
});
