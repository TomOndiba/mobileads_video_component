component.prototype.mobile = function() {
    function Video(options) {
        /* mobile doesn't support CustomEvent so use this as fallback - April */
        if (typeof CustomEvent === 'undefined') {
            CustomEvent = function(type, eventInitDict) {
                var event = document.createEvent('CustomEvent');
                event.initCustomEvent(type, eventInitDict['bubbles'], eventInitDict['cancelable'], eventInitDict['detail']);
                return event;
            };
        }
        var connectionsPerHost = 6, // max simultaneous http connections to same host; Varies for different versions of Android and iOS
            maxPossibleConnections = 16, // max connections to all hosts; Can varies for different versions of Android and iOS
            memWarning = 600, // after the number of images cached in memory hits this - start cleaning images from memory after they are shown (when play or seek) (this still means there can hold up to memWarning potentially useless images in cache)
            memCritical = 1200, // maximum amount of images to cache in memory. After the size of cache hits this, prevent downloading new images until part of cache is released. The system relies on automatic cleaning when playing and when seeking so we should have gap Critical minus Warning
            isMemCritical = false, // true if we have ever hit the memory warning
            cleaningTolerance, // if we are sure we have downloaded the right images, no need to remove images immediately after they are shown but save them for future
            totalConnections, // calculated taking into consideration number of CDNs and audio download state
            maxLoadedPerFrame = 4, // limit number of images downloaded per animation frame; this prevents video freeze to unpack from JPEG/PNG
            loadPerFrame, // number of images already downloaded during this frame
            isLoadingBlocked,

            containerEl = options.containerElement, // container node
            tabId = options.containerElement.id.split("-")[1],
            canvasEl, // canvas node
            canvasCtx, // canvas 2d context
            audioEl, // audio node, created dynamically
            seekEl, // seek node
            totalEl, // text element displaying total time
            percentageEl, // text element displaying loading percentage pressing controls
            hideControlsTimeoutId, // handler to timeout that hides controls when not used

            FPS = options.fps, // frames per second
            origFpi = 1000 / FPS,
            fpi = origFpi, // delay between frames in milliseconds
            syncTolerance, // max allowed number of frames that audio is not in sync with video; can increase if audio engine is slow on the concrete device

            threads = 0, // number of images downloaded simultaneously
            noInternetTimeout, // if no images downloaded, display a hint
            calcSpeedTimeoutId, // handler on timeout periodically recalculating the speed
            loadThickeningStage, // how many times the downloading "worm" has hit the video end. The "worm" can go back to download holes in the middle

            loadStartPos, // from which position we started downloading in the latest download session
            loadStartCount, // totalLoaded at the beginning of session. Useful for speed count method 2
            loadStartTime, // time when latest download (and speed measurement as well) started
            totalStartTime = Date.now(),
            totalLoaded = 0, // number of totally downloaded images loaded since the beginning of time
            totalCached = 0,
            speedFactor, // calculated value - shows how much download speed is slower than playing speed; value > 1 means that video is playing faster than downloading
            oldSpeedFactor, // since we have 2 speed methods, take the average value of both
            bufferSize = FPS, // if connection is slow; buffer is calculated so that video is played without lags to the very end
            isSpeedUnknown = true, // whether we have speed approximation or not
            calcSpeedMethod = 1, // method == 1 means calculate using totalLoaded, method == 2 means calculate speed using loadedInSession. when we hit the memory limit, we skip downloading images, so can't calculate speed precisely
            loadingThrottleTimeoutIds = [], // if number of image cached reaches memCritical, we start throttling images download. We should release those timed out downloads as soon as seek happens

            videoStopped = 0,
            videoWaitingForBuffer = 2,
            videoWaitingForAudio = 4,
            videoPlaying = 6,

            videoState = videoStopped,
            isVideoTryingToPlay, // whether is trying to play video
            isVideoWaiting = false,

            startVideoOnImageLoadTimeoutId,
            videoIntervalId, // correcting interval handler

            playSkip = 1, // step between frames when playing; 1 - no frames skipped; 2 - every second is skipped
            loadSkip = 1, // step between frames when downloading; 1 - no frames skipped; 2 - every second is skipped
            setSkippingTo1 = Infinity, // position after which frames won't be skipped because we've downloaded enough frames or the speed is good
            setSkippingTo2 = Infinity, // position after which we skip every second frame; At first loadSkip is set so that download rate changes. Later, when playingPos reaches that magic position (setSkippingTo1 or 2) where download rate has changed, - playSkip is set to corresponding value
            framesDelayed, // how many frames could not play because the images were not downloaded yet

            isAudioOnCanplaySupported = true, // whether HTML5 audio supports canplay event
            audioStartPos, // audio load or seek is started at this position
            audioStartTime, // audio load or seek is started at this time
            audioLoadDelay = 90, // delay between audio starting and actually playing
            audioPollingIntervalId, // audio position polling interval
            doSynchronisationAsap = false, // do synchronize audio and video as soon as possible

            nextLoadingPos, // position of the NEXT image to load
            playingPos = 0, // position of now playing or about to play from

            videoLength = options.numberOfFrames, // number of frames in the video
            duration = videoLength / FPS, // duration of video in seconds
            audioUrl = options.audioUrl, // url from which to load audio
            images = new Array(videoLength), // all saved images together with event handlers
            dimensions = options.dimensions,
            tab = options.tab,
            // array of all DIMENSIONS objects
            currentDimension, // current dimension
            width, // width of current dimension
            height, // height of current dimension
            imagesUrl, // url from which to load images
            cdnsCount,

            isLoop = options.loop, // weather play video in a loop
            isAudioLoaded, // weather can seek audio or it's downloading yet
            isAudioPlaying, // is video currently playing
            isMuted = true, // is muted
            volume = 1, // volume from 0 to 1   TODO - cookies

            isSeekReleased = true, // do not update seekbar when it's been dragged or clicked
            isPreviewShown, // special case when the preview frame is shown before starting video
            controllerType = options.controllerType, //define the types of controller - NJ
            playEvent = new CustomEvent('play', {
                detail: {
                    id: tabId
                }
            }),
            endEvent = new CustomEvent('ended', {
                detail: {
                    id: tabId
                }
            }),
            pauseEvent = new CustomEvent('pause', {
                detail: {
                    id: tabId
                }
            }),
            replayEvent = new CustomEvent('replay', {
                detail: {
                    id: tabId
                }
            }),
            muteEvent = new CustomEvent('mute', {
                detail: {
                    id: tabId
                }
            }),
            unmuteEvent = new CustomEvent('unmute', {
                detail: {
                    id: tabId
                }
            }),
            landing_url = options.landing_url,
            customTrackLink = options.customTrackLink,
            canvasWidth = 0,
            canvasHeight = 0;

        if (options.fastStart) { // USE options.fastStart to push the player start as soon as possible. If the played is deployed into a large web page, http requests from other elements can break speed calculation and lead to later video start
            isSpeedUnknown = false;
            bufferSize = connectionsPerHost;
        }

        function detectOldPhones() { // Detect old phones and adjust memory saving mode for them
            var version,
                ua = navigator.userAgent,
                io = ua.indexOf("Android");

            if (io !== -1) {
                version = parseFloat(ua.slice(io + 8));
                if (version < 3) {
                    if (version < 2.4) {
                        isAudioOnCanplaySupported = false; // audio events are broken in this version
                        memWarning *= 2 / 3;
                        memCritical *= 2 / 3;
                        connectionsPerHost = 8;
                        maxPossibleConnections = 10;
                        if (version < 2.3) {
                            memWarning *= 2 / 3;
                            memCritical *= 2 / 3;
                            setLoadSkip(2); // old OSes target old phones which have very little memory and slow processors
                            setPlaySkip(2);
                        }
                    }
                }
            } else if (/iP(hone|od|ad)/i.test(ua)) {
                isAudioOnCanplaySupported = false; // audio events are broken in all iOS devices
                version = parseInt(navigator.appVersion.match(/OS (\d+)_?/)[1], 10);
                if (version < 5) {
                    memWarning *= 2 / 3;
                    memCritical *= 2 / 3;
                    if (version < 4) {
                        memWarning *= 2 / 3;
                        memCritical *= 2 / 3;
                        setLoadSkip(2);
                        setPlaySkip(2);
                    }
                }
            }
        }


        function getImageUrl(index) {
            return imagesUrl[index % cdnsCount] + (index + 1) + '.jpg'; // distribute images loading across CDNs
        }


        function setLoadSkip(val) { // set images skipping when loading
            if (loadSkip !== val) {
                loadSkip = val;

                if (val === 2) { // skip images loading - load odd images only
                    loadThickeningStage = 0;
                    if (nextLoadingPos % 2) { // if position is odd, set downloading to the next position
                        setSkippingTo2 = nextLoadingPos - 1; // we have "holes" since the previous position
                        nextLoadingPos++;
                    } else {
                        setSkippingTo2 = nextLoadingPos; // if position is even, everything is fine
                    }
                    setSkippingTo1 = Infinity;
                } else {
                    setSkippingTo1 = nextLoadingPos; // stop skipping since this position
                    setSkippingTo2 = Infinity;
                }
            }
        }


        function setPlaySkip(val) {
            playSkip = val;
            setSkippingTo1 = Infinity;
            setSkippingTo2 = Infinity;
            resetFpi();
        }


        function adjustPlayingPos() {
            var currentImageLoaded = images[playingPos], // check if something is already loaded
                pattern = getPattern(playingPos);
            currentImageLoaded = currentImageLoaded && currentImageLoaded.complete;

            if ((currentImageLoaded && pattern === -2) || (pattern === 2)) {
                setLoadSkip(2);
                setPlaySkip(2);
                if (pattern === 2) {
                    playingPos++;
                }
            } else if (pattern === 1) {
                setLoadSkip(1);
                setPlaySkip(1);
                if (!currentImageLoaded) {
                    playingPos++;
                }
            } else if (pattern === -1) {
                setLoadSkip(1);
                setPlaySkip(1);
                playingPos += 2;
            } else if (pattern === 0 && currentImageLoaded) {
                setLoadSkip(1);
                setPlaySkip(1);
            } else if (loadSkip === 2 && playingPos > setSkippingTo2) {
                setPlaySkip(2);
            } else if (loadSkip === 1 && playingPos > setSkippingTo1) {
                setPlaySkip(1);
            }
            // pesimmistic patterns
            else if (!isSpeedUnknown && speedFactor < 1) {
                setLoadSkip(2);
                setPlaySkip(2);
            }


            if (playSkip === 2 && playingPos % 2 && playingPos < videoLength - 1) {
                playingPos++;
            }
        }


        function resetFpi() {
            fpi = origFpi * playSkip;
        }


        function resizeVideo(size) {

            if (size >= 0 && size < dimensions.length) {
                currentDimension = size;

                var dimension = dimensions[currentDimension];
                width = dimension.width;
                height = dimension.height;
                canvasWidth = width;
                canvasHeight = height;
                imagesUrl = dimension.imagesUrl;
                cdnsCount = imagesUrl.length;
                totalConnections = Math.min(connectionsPerHost * cdnsCount, maxPossibleConnections) - (isAudioLoaded ? 0 : 1);

                containerEl.style.width = width + 'px';
                containerEl.style.height = height + 'px';
                canvasEl.width = width;
                canvasEl.height = height;

                /* Check if seek is not null - NJ */
                if (seekEl != null) {
                    seekEl.style.width = (width - 210) + 'px';
                }
            }
        }


        function getSpeed() {
            if (calcSpeedMethod === 1) {
                speedFactor = totalLoaded / (Date.now() - totalStartTime) * origFpi;
            } else if (calcSpeedMethod === 2) {
                speedFactor = (oldSpeedFactor + (totalLoaded - loadStartCount) / (Date.now() - loadStartTime) * origFpi) / 2;
            }
        }


        function getBufferSize() {
            var val;

            if (loadThickeningStage === 0) {
                val = (videoLength - playingPos) * (1 - speedFactor * loadSkip);
            } else {
                val = 0;
            }

            return Math.max(totalConnections, Math.min(val, memCritical - totalCached - 1)) + totalConnections;
        }


        function calculateSpeed() {
            getSpeed();

            if (speedFactor > 2) {
                setLoadSkip(1);
                // resizeVideo(sizePreset + 1);
            } else if (speedFactor > 0.8) {
                setLoadSkip(1);
            } else {
                if (speedFactor < 0.5) {
                    setLoadSkip(2);
                    // resizeVideo(sizePreset - 1);
                }
            }

            bufferSize = getBufferSize();

            if (speedFactor < 1) {
                var loadedInSession = nextLoadingPos - playingPos;
                if (
                    loadedInSession >= 0 &&
                    loadedInSession < bufferSize
                ) {
                    percentageEl.innerText = Math.round(Math.sqrt(loadedInSession / bufferSize) * 100) + '%';
                    percentageEl.className = 'vp-hidden spinner';
                }
            }

            calcSpeedTimeoutId = setTimeout(calculateSpeed, 300);

            if (isSpeedUnknown) {
                clearTimeout(noInternetTimeout);
                isSpeedUnknown = false;
            }
        }


        function resetLoadData(currentImageLoaded) {
            var topLimit = playingPos + memWarning;

            if (
                playingPos < loadStartPos ||
                nextLoadingPos < playingPos ||
                !currentImageLoaded ||
                setSkippingTo1 < playingPos ||
                setSkippingTo1 > topLimit ||
                setSkippingTo2 < playingPos ||
                setSkippingTo2 > topLimit
            ) {
                if (playSkip === 2) {
                    setSkippingTo1 = Infinity;
                    setSkippingTo2 = playingPos;
                } else {
                    setSkippingTo1 = Infinity;
                    setSkippingTo2 = Infinity;
                }
            }

            nextLoadingPos = playingPos;
            loadStartPos = playingPos;

            if (playingPos === 0 && nextLoadingPos >= videoLength) {
                cleaningTolerance = memCritical - 50;
            } else {
                cleaningTolerance = memWarning;
            }

            if (isMemCritical) {
                loadStartCount = totalLoaded;
                loadStartTime = Date.now();
                calcSpeedMethod = 2;
                oldSpeedFactor = speedFactor;

                for (var i = 0, l = loadingThrottleTimeoutIds.length; i < l; i++) {
                    clearTimeout(loadingThrottleTimeoutIds[i]);
                    threads--;
                }
                loadingThrottleTimeoutIds = [];
            }

            if (totalCached > cleaningTolerance) {
                cleanMemory();
            }

            if (isVideoTryingToPlay) {
                isVideoWaiting = true;
                videoState = videoWaitingForBuffer;
            }

            isPreviewShown = false;
            doSynchronisationAsap = false;
            resetFpi();

            framesDelayed = 0;
            loadThickeningStage = 0;
            syncTolerance = FPS / 3;
            isLoadingBlocked = false;

            if (!isSpeedUnknown) {
                clearTimeout(calcSpeedTimeoutId);
                calcSpeedTimeoutId = setTimeout(calculateSpeed, 100);
                bufferSize = getBufferSize();
            }
        }


        function onImageLoad(index) {
            totalLoaded++;
            totalCached++;

            if (isVideoWaiting) {
                if (nextLoadingPos - playingPos > bufferSize) { // when buffer is full, start playing video
                    startVideoOnImageLoadTimeoutId = setTimeout(function() {
                        if (isVideoWaiting) {
                            startPlaying();
                        }
                    }, fpi);
                } else if (index === playingPos && !isPreviewShown) {
                    playFrame();
                    isPreviewShown = true;
                } else if (isSpeedUnknown && totalLoaded > totalConnections) {
                    calculateSpeed();
                }
            } else {
                loadPerFrame++;
                if (loadPerFrame > maxLoadedPerFrame) {
                    setTimeout(loadNextImage, fpi / 7);
                    return;
                }
            }

            loadNextImage();
        }


        function cleanThrottle(id) {
            var i = loadingThrottleTimeoutIds.indexOf(id);

            if (i !== -1) {
                loadingThrottleTimeoutIds.splice(i, 1);
            }
        }


        function onImageFailed(index) {
            deleteImage(images[index], index, false);

            if (index >= playingPos) {

                var timeoutId = setTimeout(function() {
                    if (index >= playingPos && index - playingPos < cleaningTolerance && (loadSkip === 1 || loadSkip === 2 && index % 2 === 0) && !images[index]) {
                        loadImage(index);
                    } else {
                        loadNextImage();
                    }
                    cleanThrottle(timeoutId);
                }, videoState === videoPlaying ? 10 : 500); // reload image

                loadingThrottleTimeoutIds.push(timeoutId);
            } else {
                loadNextImage();
            }
        }


        function loadImage(index) {
            var img = new Image();
            images[index] = img;

            img.onload = function() {

                onImageLoad(index);

            };
            img.onerror = function() {
                onImageFailed(index);
            };
            img.src = getImageUrl(index);
        }


        function deleteImage(img, index, complete) {
            images[index] = undefined;
            if (complete) {
                totalCached--;
            }
            img.onload = undefined;
            img.onerror = undefined;
            img.src = ''; // only this line actually releases memory taken by the bitmap
        }


        function loadNextImage() {
            if (!isVideoTryingToPlay && nextLoadingPos - playingPos > bufferSize) { // If video is stopped, do not load more than bufferSize images
                threads--; // Indicate we have killed one downloading thread
                isLoadingBlocked = true;
            } else if (totalCached > memCritical) { // Do not hold too much images in cache, because otherwise OS will terminate the browser
                getSpeed(); // This is the last time when we can calculate speed percsisely using current method; The downloading is starting to throttle now
                isMemCritical = true;
                calcSpeedMethod = 0; // Neither method will work now
                clearTimeout(calcSpeedTimeoutId); // Stop calculating speed

                if (isVideoTryingToPlay) { // If video is started - start throttling
                    var timeoutId = setTimeout(function() {
                        loadNextImage(); // Continue thread after timeout
                        cleanThrottle(timeoutId); // Remove timeout from the list because it has fired; We track active timeouts only
                    }, 4 * fpi * totalConnections); // Periodically ping if we can resume downloading

                    loadingThrottleTimeoutIds.push(timeoutId); // Record this timeout - so we can quickly move to downloading something different
                } else {
                    threads--; // Otherwise stop downloading by killing current thread
                    isLoadingBlocked = true;
                }
            } else { // IF EVERYTHING IS FINE:

                while (nextLoadingPos < videoLength) { // Find next image to load by iterating over the array
                    if (images[nextLoadingPos]) {
                        nextLoadingPos += loadSkip;
                    } else {
                        loadImage(nextLoadingPos);
                        nextLoadingPos += loadSkip; // Set position to start the new search from
                        return; // Success
                    }
                }

                loadThickeningStage++; // If we did not return, it means we have reached the end

                if (isVideoWaiting) { // If we wanted to play, but could not, start playing
                    startPlaying();
                }

                if (totalCached < videoLength && loadThickeningStage < 3) { // If we have downloaded to the end but have "holes" in the middle (plus prevent possible recursion)

                    if (loadThickeningStage === 1 && loadSkip === 2) { // If we are skipping frames - put all downloading threads to fix the holes while playing, and load the rest of the video in the best possible quality
                        nextLoadingPos = playingPos + // predict the position from which we can load without skipping to the very end:
                            Math.floor(getBufferSize()); // and downloading speed with the help of wise function returning real-time buffer size depending on download speed
                        setLoadSkip(1); // This records the position from which we load without skipping
                        cleaningTolerance = memCritical - 50;
                    } else {
                        nextLoadingPos = 0; // Otherwise check the video for holes from the very beginning
                        if (memCritical > videoLength / 2) { // I have an idea of optimizing the video for seek:
                            loadSkip = 1; // if it's possible, download the video entirely
                        } else {
                            loadSkip = 2; // if not, download with frame skipping. This lowers the video quality, but allows to seek over the maximum part of the video video instantly
                        }
                    }

                    loadNextImage();
                } else {
                    threads--;
                    isLoadingBlocked = true;
                }
            }
        }


        function cleanMemory() {

            function cleanImage(i) {
                var img = images[i];
                if (img) {
                    var complete = img.complete;
                    if (!complete) { // if we are deleting currently downloading image
                        threads--; // it means we kill one downloading thread
                    }
                    deleteImage(img, i, complete);
                }
            }

            var i = 0;

            while (i < playingPos && totalCached >= cleaningTolerance) {
                cleanImage(i++);
            }

            i = videoLength - 1;
            while (totalCached >= cleaningTolerance) {
                cleanImage(i--);
            }
        }


        function restart() {
            playingPos = 0;
            stopPlaying();
            updateRange();
            drawFrame();

            if (isLoop) {
                loadVideo();
            } else {
                isVideoTryingToPlay = false;
            }
        }


        function drawFrame() {
            var img = images[playingPos],
                complete = img && img.complete;

            if (typeof img == 'undefined') {
                return;
            }

            var height = img.height;

            var x = 0,
                y = 0;

            /* adjust postion */
            if (img.width > img.height) {
                y = (canvasHeight - img.height) / 2;
            } else {
                x = (canvasWidth - img.width) / 2;

                if (img.height < canvasHeight) {
                    y = (canvasHeight - img.height) / 2;
                }
            }

            if (complete) {
                // handle broken frame
                canvasCtx.drawImage(img, x, y, img.width, img.height); // draw the frame

                if (totalCached > cleaningTolerance) {
                    deleteImage(img, playingPos, complete);
                }

                return true;
            }

            return false;
        }


        function iteratePlayingPos() {
            loadPerFrame = 0;
            playingPos++;

            if (playingPos >= setSkippingTo1) {
                setPlaySkip(1);
            } else if (playingPos > setSkippingTo2) {
                setPlaySkip(2);
            }

            if (playSkip === 2) {
                playingPos++;
            }
        }

        var autoIncrement = 0,
            intervals = {};

        var clearCorrectingInterval = function(id) {
            clearTimeout(intervals[id]);
            delete intervals[id];
        };

        function playFrame() {

            if (doSynchronisationAsap || playingPos % 7 === 0) {
                doSynchronisationAsap = false;
                updateRange();

                if (isAudioPlaying) {
                    var videoMinusAudioMs = (playingPos / FPS - audioEl.currentTime) * 1000;

                    fpi = origFpi * playSkip + videoMinusAudioMs / 10;
                    videoMinusAudioMs = Math.abs(videoMinusAudioMs);
                    if (videoMinusAudioMs > 380) {
                        audioEl.volume = 0;
                    } else {
                        audioEl.volume = volume;
                    }
                    if (fpi < origFpi / 2 || fpi > origFpi * 2 || videoMinusAudioMs > 1600) {
                        resetFpi();
                        playingPos = Math.round(audioEl.currentTime * FPS);
                        clearCorrectingInterval(videoIntervalId);
                        videoIntervalId = setCorrectingInterval(playFrame);
                        doSynchronisationAsap = true;

                        if (playingPos >= videoLength) {
                            restart();
                            return;
                        }
                    }
                }

            }

            if (drawFrame()) {
                iteratePlayingPos();
                if (playingPos >= videoLength) {
                    console.log('endedddd')
                    canvasEl.dispatchEvent(endEvent);
                    restart();
                    return;
                }
                if (isPreviewShown && !loadThickeningStage && videoLength > nextLoadingPos && nextLoadingPos - playingPos < totalConnections) {
                    setLoadSkip(2);
                }
            } else {
                delayFrames();
            }
        }


        function delayFrames() {
            var pattern = getPattern(playingPos);

            if (pattern === 0 || pattern === 1) {
                playingPos++;
            }
            if (pattern === -1) {
                playingPos += 2;
            } else if (pattern === 2) {
                playingPos++; // get in sync with frames skipping
                setLoadSkip(2); // set skipping, it looks like we can't download video in good quality
            } else {
                setLoadSkip(2); // set skipping, it looks like we can't download video in good quality

                if (
                    nextLoadingPos < playingPos ||
                    //nextLoadingPos - playingPos > 100 ||
                    (isAudioPlaying && (audioEl.currentTime * FPS - playingPos > syncTolerance)) ||
                    framesDelayed > 2 * syncTolerance
                ) {
                    stopPlaying();
                    loadVideo();
                }
                framesDelayed++;
            }
        }


        function getPattern(index) {
            var img = images[++index]; // check weather we reached an area loaded with loadSkip = 2
            img = img && img.complete; // recognize the pattern where every second image is skipped
            var img1 = images[++index];
            img1 = img1 && img1.complete;
            var img2 = images[++index];
            img2 = img2 && img2.complete;
            if (img && !img1 && img2) { // it looks like the images are loaded ok with loadStep === 2
                return 2;
            } else if (img && img1 && img2) {
                return 1;
            } else if (!img && img1 && !img2) {
                return -2;
            } else if (img1 && img2) {
                return -1;
            } else if (img && img1) {
                return 0;
            }
        }


        function startPlaying() {
            if (isMuted || !isAudioLoaded) {
                startVideo();
            } else {
                videoState = videoWaitingForAudio;
                startAudio();
            }
        }


        function stopPlaying() {
            containerEl.dispatchEvent(pauseEvent);
            clearTimeout(calcSpeedTimeoutId);
            percentageEl.className = 'vp-hidden spinner';

            isVideoWaiting = false;
            videoState = videoStopped;

            pauseAudio();

            clearCorrectingInterval(videoIntervalId);
            clearInterval(startVideoOnImageLoadTimeoutId);
        }


        function startVideo() {
            containerEl.dispatchEvent(playEvent);
            clearTimeout(calcSpeedTimeoutId);
            percentageEl.className = 'vp-hidden spinner';

            isVideoWaiting = false;
            videoState = videoPlaying;
            isPreviewShown = true;


            clearCorrectingInterval(videoIntervalId);
            videoIntervalId = setCorrectingInterval(playFrame);
            clearTimeout(startVideoOnImageLoadTimeoutId);
        }


        function startAudio() {
            if (isAudioLoaded && (videoState >= videoWaitingForAudio) && !audioPollingIntervalId) {

                audioStartTime = Date.now();
                framesDelayed = 0;

                if (isAudioOnCanplaySupported) {
                    setAudioCoords();

                    if (audioEl.readyState === 4) { // if audio is ready - event canplay will never be called
                        onAudioCanPlay();
                    }
                    // else just wait event to fire
                } else {
                    audioStartPos = Infinity;
                    startPollingAudioIOS();
                }
            } else if (!isVideoTryingToPlay) {
                setAudioCoords();
            }
        }


        function onAudioCanPlay() {
            if (!isAudioPlaying) {
                if (!isAudioLoaded) { // this could be initial loading event
                    isAudioLoaded = true;
                    if (!isMuted && videoState === videoPlaying) { // deadlocks?
                        startAudio();
                    }

                    totalConnections++;
                    threads++;
                    loadNextImage();
                } else if (videoState === videoWaitingForAudio) {
                    if (isMuted) {
                        startVideo();
                    } else if (!audioPollingIntervalId) {
                        startPollingAudio();
                    }
                } else if (!isMuted && videoState === videoPlaying && !audioPollingIntervalId) {
                    startPollingAudio();
                }
            }
        }


        function loadAudio() {

            audioEl = new Audio(audioUrl);
            audioEl.volume = 0;

            if (isAudioOnCanplaySupported) {
                audioEl.addEventListener('canplay', onAudioCanPlay);
            } else {
                onAudioCanPlay();
            }
        }


        function setAudioCoords() {
            audioEl.currentTime = audioStartPos = playingPos / FPS + (isVideoWaiting ? 0 : (audioLoadDelay - 15) / 1000);
            audioStartPos += 0.0001;
        }


        function startPollingAudio() {
            audioEl.play();

            audioPollingIntervalId = setInterval(function() {
                if (audioEl.currentTime > audioStartPos) {
                    stopPollingAudio(true);
                }
            }, 13);
        }


        function startPollingAudioIOS() {
            audioEl.play();

            audioPollingIntervalId = setInterval(function() {
                if (audioEl.readyState === 4) {
                    if (audioStartPos === Infinity) {
                        setAudioCoords();
                    } else if (audioEl.currentTime > audioStartPos) {
                        stopPollingAudio(true);
                    }
                }
            }, 13);
        }


        function stopPollingAudio(normal) {

            clearInterval(audioPollingIntervalId);
            audioPollingIntervalId = 0;

            if (videoState === videoWaitingForAudio) {
                startVideo();
            }

            if (normal) {
                audioLoadDelay = (audioLoadDelay + 2 * (Date.now() - audioStartTime)) / 3;

                if (!isMuted && videoState === videoPlaying) {
                    isAudioPlaying = true;
                    doSynchronisationAsap = true;
                }
            }
        }


        function pauseAudio() {
            isAudioPlaying = false;
            if (typeof audioEl != 'undefined') {
                audioEl.pause();
                audioEl.volume = 0;
            }
            if (audioPollingIntervalId) {
                stopPollingAudio();
            }
            resetFpi();
        }


        function loadVideo() {

            adjustPlayingPos();

            if (playingPos >= videoLength) { // some error protection
                restart();
                return;
            }

            var currentImageLoaded = images[playingPos];
            currentImageLoaded = currentImageLoaded && currentImageLoaded.complete;

            resetLoadData(currentImageLoaded);

            while (threads < totalConnections && !isLoadingBlocked) { // start loading maxConnections images
                loadNextImage();
                threads++;
            }

            if (currentImageLoaded) {
                if (isVideoTryingToPlay && (nextLoadingPos - playingPos > bufferSize)) {
                    startPlaying();
                } else {
                    playFrame();
                    isPreviewShown = true;
                }
            }
        }


        function setVolume(newVolume) {
            volume = newVolume;
        }

        function setAttribute(name, val) {
            containerEl.setAttribute(name, val);
        }

        /* MAIN FUNCTIONS */

        function mute() {
            containerEl.dispatchEvent(muteEvent);
            pauseAudio();
            isMuted = true;
        }


        function unmute() {
            if (audioUrl != "") {
                containerEl.dispatchEvent(unmuteEvent);
                isMuted = false;
                startAudio();
            }
        }


        function play() {
            isVideoTryingToPlay = true;
            loadVideo();
        }


        function stop() {
            isVideoTryingToPlay = false;
            stopPlaying();
        }


        function seek(newPos) {
            isSeekReleased = true;
            stopPlaying();

            playingPos = newPos;
            updateRange();
            loadVideo();
        }

        /* replay video, audio play by default - NJ */
        function replay() {
            containerEl.dispatchEvent(replayEvent);
            restart();
            startPlaying();
            isTrying2Play = true;
            isVideoTryingToPlay = true;
            unmute();
        }

        // function to get the current playing time - April
        function currentTime() {
            return Math.floor(playingPos / FPS);
        }

        this.play = play;

        this.stop = stop;

        this.pause = stop;

        this.replay = replay;

        this.seek = seek;

        this.currentTime = currentTime;

        this.mute = mute;

        this.unmute = unmute;

        this.setVolume = setVolume;

        this.duration = duration;

        this.setAttribute = setAttribute;

        function createHTML() {

            var t = document.createElement('div');

            var $ = t.querySelector.bind(t),
                controlsHeight = 29;

            t.innerHTML =
                '<canvas id=vp-canvas></canvas> \
                    <input id=vp-seek type=range value=0 min=0>\
                 </div>\
                 <div id=vp-percentage class=vp-hidden></div>';
            
            canvasEl = $('#vp-canvas');
            console.log(canvasEl)
            seekEl = $('#vp-seek');
            totalEl = $('#vp-total');
            percentageEl = $('#vp-percentage');
            canvasCtx = canvasEl.getContext("2d");
        }


        function animate(btn, btnClass, puffClass) {
            /* Check if btn is not null - NJ */
            if (btn != null) {
                btn.className = btnClass;

                /* use smaller image for small ad - April */
                if (height < 100) {
                    btn.className = btn.className + ' small';
                }
            }
        }


        function bindActions() {

            function lockSeek() {
                isSeekReleased = false;
            }


            function seekUsingRange() {
                seek(Math.round(this.value));
            }

            /* Check if seek is not null - NJ */
            if (seekEl != null) {
                seekEl.addEventListener('mousedown', lockSeek);
                seekEl.addEventListener('touchstart', lockSeek);

                seekEl.addEventListener('mouseup', seekUsingRange);
                seekEl.addEventListener('touchend', seekUsingRange);

                seekEl.max = videoLength - 1;
            }
        }


        function updateRange() {
            /* Check if seekEl is not null - NJ */
            if (seekEl != null) {
                if (isSeekReleased) {
                    seekEl.value = playingPos;
                }
            }
        }


        detectOldPhones();

        createHTML();

        bindActions();

        resizeVideo(options.defaultDimension);

        if (options.autoplay) {
            isVideoTryingToPlay = true;
        } else {
            isVideoTryingToPlay = false;
        }

        loadVideo();

        loadAudio();

        noInternetTimeout = setTimeout(function() {
            if (playingPos === 0 && totalLoaded === 0) {
                percentageEl.innerText = 'no internet';
                percentageEl.className = 'vp-hidden spinner';
            }
        }, 8000);

        var setCorrectingInterval = function(func) {
            var id = autoIncrement++,
                planned = Date.now() - fpi;
            var o = planned,
                x;

            function tick() {
                func();
                if (intervals[id] !== undefined) {
                    planned += fpi;
                    x = Date.now();
                    var delta = planned - x;
                    if (delta < 0 && !isAudioPlaying) {
                        /* @NOTE  disable to fix invalid current time when tab inactive - NJ */
                        //playingPos -= Math.round(delta / fpi);
                        delta = 0;
                        if (playingPos >= videoLength) {

                            /* Video Stops and not restart, fire end event - NJ */
                            if (!isLoop) {
                                containerEl.dispatchEvent(endEvent);
                            }
                            restart();
                            return;
                        }
                    }
                    /* @NOTE time change from delta to origFpi to fix invalid current time when tab inactive - NJ */
                    intervals[id] = setTimeout(tick, origFpi);
                }
            }

            intervals[id] = setTimeout(tick, 0);
            return id;
        };

        console.log(canvasEl)
        canvasEl.play = this.play;
        canvasEl.pause = this.pause;
        canvasEl.mute = this.mute;
        canvasEl.unmute = this.unmute;


        return canvasEl;
    }

    this.video = new Video({
        fps: 10,
        containerElement: this.videoContainer,
        numberOfFrames: 152,
        dimensions: [{
            width: 320,
            height: 480,
            imagesUrl: ['https://rmarepo.richmediaads.com/2688/images/autoplay/vyyd8x1mjl6rskcyds4i/image_']
        }],
        defaultDimension: 0,
        audioUrl: 'https://rmarepo.richmediaads.com/2688/images/autoplay/vyyd8x1mjl6rskcyds4i/audio.mp3',
        autoplay: 1,
        controllerType: 1,
        landing_url: '',
        customTrackLink: '',
        autoplay: false,
        tab: 1
    });
}