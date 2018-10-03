/*! videojs-hlsjs - v1.4.8 - 2018-10-04*/
/*! videojs-hls - v0.0.0 - 2015-9-24
 * Copyright (c) 2015 benjipott
 * Licensed under the Apache-2.0 license. */
(function (window, videojs, Hls, document, undefined) {
  // 'use strict';
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  function guid() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
  }
  /**
  * Initialize the plugin.
  * @param options (optional) {object} configuration for the plugin
  */
  var Component = videojs.getComponent('Component'),
      Tech = videojs.getTech('Tech'),
      Html5 = videojs.getTech('Html5');

  var Hlsjs = videojs.extend(Html5, {
    createEl : function () {
      this.el_ = Html5.prototype.createEl.apply(this, arguments);
      this.setupHLS_();
      if (this.options_.source){
        this.src(this.options_.source.src);
      }
      
      this.el_.tech = this;
      return this.el_;
    },
    onMediaAttached: function () {
      this.triggerReady();
    },
    onLevelLoaded: function(event, data) {
      this.duration = data.details.live ? function () {return Infinity;} : Html5.prototype.duration;
    },
    onManifestParsed: function() {
      if (this.player().options().autoplay) {
        this.player().play();
      }
    },
    setSrc: function (src) {
      if (this.hls_.url){
        this.hls_.destroy();
        this.audioTracks_ = new Html5.prototype.audioTracks();
        this.setupHLS_();
      }
      this.hls_.loadSource(src);
    },
    onError: function (event, data) {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            // try to recover network error
            window.console.log('fatal network error encountered, try to recover');
            this.trigger('error');
            this.hls_.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            window.console.log('fatal media error encountered, try to recover');
            this.hls_.recoverMediaError();
            break;
          default:
            // cannot recover
            this.hls_.destroy();
            window.console.error(data);
            break;
          }
        }
        switch (data.details) {
          case Hls.ErrorDetails.MANIFEST_LOAD_ERROR:
          case Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT:
          case Hls.ErrorDetails.MANIFEST_PARSING_ERROR:
          case Hls.ErrorDetails.LEVEL_LOAD_ERROR:
          case Hls.ErrorDetails.LEVEL_LOAD_TIMEOUT:
          case Hls.ErrorDetails.LEVEL_SWITCH_ERROR:
          case Hls.ErrorDetails.FRAG_LOAD_ERROR:
          case Hls.ErrorDetails.FRAG_LOOP_LOADING_ERROR:
          case Hls.ErrorDetails.FRAG_LOAD_TIMEOUT:
          case Hls.ErrorDetails.FRAG_PARSING_ERROR:
          case Hls.ErrorDetails.BUFFER_APPEND_ERROR:
          case Hls.ErrorDetails.BUFFER_APPENDING_ERROR:
            window.console.log(data.type);
            window.console.log(data.details);
            break;
          default:
            break;
        }
      },
      dispose: function () {
        this.hls_.destroy();
        return Html5.prototype.dispose.apply(this);
      },
      onHlsManifestLoaded: function(event,data) {
        // clear current audioTracks
        for (var i=0; i< data.audioTracks.length;i++){
          data.audioTracks[i].label = data.audioTracks[i].name;
          data.audioTracks[i].hls_ = this.hls_;
          Object.defineProperty(data.audioTracks[i], "enabled", {
            set: function (x) {
              if (x){
                this.hls_.audioTrack = this.id; 
              }
            }, 
            get: function() {
              return this.hls_.audioTrack === this.id;
            }
          });
          this.audioTracks_.addTrack(data.audioTracks[i]);
        }

      },
      audioTracks: function() {
        if (!this.audioTracks_){
          this.audioTracks_ = Html5.prototype.audioTracks();
        }
        return this.audioTracks_;
      },
      audioTrackChange_: function(e) {
        window.console.log(e);
        this.player().trigger({
          'type': 'audiotrackchange',
          'data': e
        });
      },
      setupHLS_: function() {
        this.hls_ = new Hls({
        xhrSetup: function(xhr, url){
          if (!window.playback_session_id){
            window.playback_session_id = guid();
          }
          xhr.setRequestHeader('X-Playback-Session-Id', window.playback_session_id);
        }
      });
      
      if (!this.audioTracks_){
        this.audioTracks_ = Html5.prototype.audioTracks();
      }

      this.hls_.on(Hls.Events.MEDIA_ATTACHED, videojs.bind(this, this.onMediaAttached));
      this.hls_.on(Hls.Events.MANIFEST_PARSED, videojs.bind(this, this.onManifestParsed));
      this.hls_.on(Hls.Events.LEVEL_LOADED, videojs.bind(this, this.onLevelLoaded));
      this.hls_.on(Hls.Events.MANIFEST_LOADED, videojs.bind(this, this.onHlsManifestLoaded));
      this.hls_.on(Hls.Events.ERROR, videojs.bind(this, this.onError));
      this.hls_.on(Hls.Events.AUDIO_TRACK_SWITCHED, videojs.bind(this, this.audioTrackChange_));
      this.hls_.attachMedia(this.el_);
      }
    });

    Hlsjs.isSupported = function(){
      return Hls && Hls.isSupported();
    };
    Hlsjs.canPlaySource = function (techId, source) {
      // if (Html5.canPlaySource(techId, source)) {
      //   return false;
      // } else {

      //Safari's MSE implementation is bad so use this to make sure we use their native 
      //implementation
      var isSafari = /^((?!chrome|android|iphone|ipad).)*safari/i.test(navigator.userAgent);
      if (techId.type === "application/x-mpegURL" && !isSafari){
        return Hls && Hls.isSupported();
      } else {
        return false;
      }
      // }
    };

    // register as Component and Tech;
    Tech.registerTech('Hlsjs', Hlsjs);

    videojs.options.techOrder.unshift('Hlsjs');
})
(window, window.videojs, window.Hls, document);
