
var g_isDebug = false;
var g_isMediaW375 = false;

// speeds            1     2     3     4     5     6     7     8     9
var g_aiSpeeds = [2000, 1400,  900,  800,  700,  600,  500,  400,  300]; // Millis to show letter.
var g_ixSpeed = 6; // Index of the speed settings.
var g_iSpeed = g_aiSpeeds[g_ixSpeed]; // Speed in milis for letter.
var g_ixWordListCurrent = 0; // Which word-list is used
var g_ixWordCurrent = -1; // Which word in which word-list. Reset when starting;
//var g_asWordList = ["not set"]; // List of words to show. Exploded from word-list.
const vocab = vocabEng;
var g_sWordCurrent = vocab.asList[0]; // Current word.
var g_iWordCurrentRepeats = 0;

var g_iFrameCurrent = 0; // Current animation frame. Could be blank, a letter or part of a letter.
var g_asFramePics = new Array(); // List of frames to animate, eg ["_", "s", "i", "g", "n"]
var g_aiFrameTimes = new Array(); // List of the times each letter will show, eg [20, 1000, 1000, 1000, 1000]
var g_aiFrameLumin = new Array(); // The ix of current letter in answer.

let g_isVocabVowels = false;

var g_intervalLetter; // Window interval to manage timing.
var g_iPauseDurationMin = 50; // Between double letters pause. This is minimum millis.
//var g_iPauseDurationMax = 200; // Between double letters pause. This is minimum millis.

const ui = {
    divBuffer: null, // Invisible area to buffer/cache images.
    divDebug: null, // Developer debug area receiving trace messages.
    divSpeed: null, // Display of the current speed, eg "5".
    divImg: null, // Main letter image area.
    btnForward: null, // Forward button. Needs a reference because face value changes.
    btnFaster: null, // Back button.
    btnSlower: null, // Down button.
    btnRepeat: null // Left button.
}

var PHASE_INIT = 0; // Just loaded, no action yet. No repeat possible.
var PHASE_ANIM = 1; // Running the animation.
var PHASE_ANSWER = 2; // Has run, and user has seen answer.
var g_phase = PHASE_INIT;
var asPhaseKey = ["INIT", "ANIM", "ANSWER", "(NONE)"];

var g_sIxSpeedCookieName = "fingerSpell_ixCookieSpeed"; // Marker for ix of users chosen speed.
var g_sIxWordCookieName = "fingerSpell_ixWord"; // Marker for ix of word-list.
//var g_sIxWordListCookieName = "fingerSpell_ixWordList"; // Marker for ix of word-list.
var g_sIsVocabVowelsCookieName = "fingerSpell_isVocabVowels"; // Marker for ix of word-list.
var oVocab = null;

const oCookie = {
    _sCookieName_: "fingerspellSession",
    cache: {},
    init: function() {
    	var sCache = getCookie(this._sCookieName_);
    	if (sCache === "") {
    	    this.cache = {};
    	} else {
    	    this.cache = JSON.parse(sCache);
    	}
        return this;
    },
    setIxSpeed: function(ixSpeed) {
        this.set("ixSpeed", ixSpeed);
    },
    getIxSpeed: function(ixDefault) {
        return this.get("ixSpeed", ixDefault);
    },
    setIdVocab: function(sIdVocab) {
        this.set("sIdVocab", sIdVocab);
    },
    getIdVocab: function(sDefault="vocabEng") {
        return this.get("sIdVocab", sDefault);
    },
    set: function(sAttr, vValue) {
        this.cache[sAttr] = vValue; // Update cache.
        let sCache = JSON.stringify(this.cache);
        setCookie(this._sCookieName_, sCache);
    },
    get: function(sAttr, vDefault=null) {
        if (this.cache.hasOwnProperty(sAttr)) {
            return this.cache[sAttr];
        }
        return vDefault;
    },
	deleteAll: function() {
        setCookie(this._sCookieName_);
	}
}

/**
 * Make anim run faster.
 */
function doClickFaster(){
	changeSpeed(1);
	flashClick(ui.btnFaster);
}
/**
 * Make animm run slower.
 */
function doClickSlower(){
	changeSpeed(-1);
	flashClick(ui.btnSlower);
}
/**
 * User want to speed up or slow down.
 * Note: Will not effect running movie.
 * Note: No effect if above-max or below-min is specified.
 * @param iDiff Change. eg 1 will make faster, -1 slower.
 */
function changeSpeed(iDiff){
	var iRequired = g_ixSpeed + iDiff;
	if((iRequired >= 0) && (iRequired < g_aiSpeeds.length)){
		g_ixSpeed = iRequired;
	}
	if(iRequired == g_ixSpeed){
		setCookie(g_sIxSpeedCookieName, g_ixSpeed);
		oCookie.setIxSpeed(g_ixSpeed);
		g_iSpeed = g_aiSpeeds[g_ixSpeed];
		displaySpeed();
	}
}
/**
 * Get chosen settings from cookies on open page.
 */
function resumeSettings(){
	// Resume Speed from cookie via its ix.
	g_ixSpeed = oCookie.getIxSpeed(g_ixSpeed);
	g_ixSpeed = Math.min((g_aiSpeeds.length - 1), g_ixSpeed);
	g_iSpeed = g_aiSpeeds[g_ixSpeed];
	// Resume Word-List from cookie via its ix.
	g_isVocabVowels = getCookieAsBool(g_sIsVocabVowelsCookieName, false);
	if (g_isVocabVowels) {
	    vocabVowels.init();
	    vocab.asList = vocabVowels.generateVocab();
//        g_ixWordListCurrent = 0;
        g_ixWordCurrent = 0;
        updateButtonStyleToVocabVowels();
	} else {
        var iRandom = Math.round(Math.random() * 1000) % vocab.asList.length;
//        g_ixWordListCurrent = getCookieAsInt(g_sIxWordListCookieName, iRandom);
//        g_ixWordListCurrent = Math.min((vocab.asList.length - 1), g_ixWordListCurrent);
        // Resume Word from cookie via its ix.
        var dt = new Date();
        g_ixWordCurrent = getCookieAsInt(g_sIxWordCookieName, dt.getSeconds());
        g_ixWordCurrent = Math.min((vocab.asList.length - 1), g_ixWordCurrent);
	}
}

function doClickSwitchVocabVowels(uiSrc) {
    g_isVocabVowels = !g_isVocabVowels;
    updateButtonStyleToVocabVowels(uiSrc);
    setCookie(g_sIsVocabVowelsCookieName, g_isVocabVowels.toString());
}
function updateButtonStyleToVocabVowels(uiSrc=null) {
    if (uiSrc === null) {
        uiSrc = document.querySelector("#buttonVocabVowels");
    }
    uiSrc.className = g_isVocabVowels ? "buttonFunction" : "buttonFunctionOff";
}

function doChangeVocab(selSrc) {
    oCookie.setIdVocab(selSrc.value);
    g_isVocabVowels = !g_isVocabVowels;

    setCookie(g_sIsVocabVowelsCookieName, g_isVocabVowels.toString());

}


/**
 * Search through cookies and return value as an int.
 * If no value can be safely returned, return the default value.
 */
function getCookieAsBool(sCookieName, isDefault){
	var sIsOut = getCookie(sCookieName);
	return (sIsOut === "") ? false : (sIsOut == "true");
}
/**
 * Search through cookies and return value as an int.
 * If no value can be safely returned, return the default value.
 */
function getCookieAsInt(sCookieName, iDefault){
	var sIxSpeed = getCookie(sCookieName);
	if(sIxSpeed != ""){
		try {
			var vIxSpeed = parseInt(sIxSpeed);
			if(isNaN(vIxSpeed)){
				return iDefault;
			}
			return vIxSpeed;
		} catch (e){
			return iDefault;
		}
	}
	return iDefault;
}
/**
 * Present the users speed on the screen.
 */
function displaySpeed(){
	ui.divSpeed.innerHTML = (g_ixSpeed + 1);
}
/**
 * Debugging message.
 * @param sOut Message to display.
 */
function trace(sOut){
	if(g_isDebug){
		var sVal = "";
		if(typeof sOut != "undefined"){
			sVal = ui.divDebug.innerHTML + sOut + "<br/>";
		}
		console.log(sOut);
		ui.divDebug.innerHTML = sVal;
	}
}
/**
 * Plan out the amimation. Creating two arrays letters and milli-times.
 * For example the word "job" will produce the following arrays:
 * ["_", "j0", "j1", "j2", "o", "b"] - set into g_asFramePics
 * [20,  333,  333,  333,  1000, 1000] - set into g_aiFrameTimes
 */
function bufferWord(){
	var sWordCurr = g_sWordCurrent;
	var asLetters = getLetterArrayFromWord(g_sWordCurrent);
	cacheLetterImagesOnScreen(asLetters);
	g_iFrameCurrent = 0;
	g_asFramePics = new Array();
	g_aiFrameTimes = new Array();
	g_aiFrameLumin = new Array();
	var isShowLumin = (PHASE_ANSWER == g_phase);
	var iPauseDuration = Math.max(g_iPauseDurationMin, Math.round(g_iSpeed / 10));
	var cPrevious = "%nothing%";
	for (var iC = 0; iC < g_sWordCurrent.length; iC++) {
		var cCurr = g_sWordCurrent.charAt(iC).toLowerCase();
		if(cPrevious == cCurr){
			// Put blank in front of each letter.
			g_asFramePics[g_asFramePics.length] = "-";
			g_aiFrameTimes[g_aiFrameTimes.length] = iPauseDuration;
			trace("time of pause between letters is " + (iPauseDuration));
			g_aiFrameLumin[g_aiFrameLumin.length] = -1;
		}
		cPrevious = cCurr;
		
		// Create temporary array for just this letter, later.
		// added to main word array. This may be overwritten
		// if the letter is animated.
		var asFramePicsForThisLetter = [cCurr];
		if(cCurr == 'h'){
			asFramePicsForThisLetter = ["h0","h1","h2","h3","h4","h4","h4"];
		} else if(cCurr == 'j'){
			asFramePicsForThisLetter = ["j0","j1","j2","j2","j2"];
		}
		var iNumberOfParts = asFramePicsForThisLetter.length;
		// As the g_iWordCurrentRepeats increases, speed gets slower and slower.
		var iSpeedPart = Math.round((g_iSpeed + (Math.max(0, (g_iWordCurrentRepeats - 1)) * 500)) / iNumberOfParts);
		for ( var iP = 0; iP < iNumberOfParts; iP++) {
			g_asFramePics[g_asFramePics.length] = asFramePicsForThisLetter[iP];
			g_aiFrameTimes[g_aiFrameTimes.length] = iSpeedPart;
			g_aiFrameLumin[g_aiFrameLumin.length] = isShowLumin ? iC : -1;
		}
	}
	g_asFramePics[g_asFramePics.length] = "-";
	g_aiFrameTimes[0] = Math.max(g_aiFrameTimes[0], 500);
	g_aiFrameTimes[g_aiFrameTimes.length] = 0;
	g_aiFrameLumin[g_aiFrameLumin.length] = isShowLumin ? 100 : -1; // Past last letter.
	if (g_isDebug) {
		var sOut = "";
		for ( var iWL = 0; iWL < g_asFramePics.length; iWL++) {
			sOut += "<br/>letter: " + g_asFramePics[iWL] + " will show for " + g_aiFrameTimes[iWL] + " millis";
		}
		trace(sOut);
	}
}
function getLetterArrayFromWord(sWord) {
	sWord = sWord.toLowerCase();
	var asOut = [];
	for (var iChar = 0; iChar < sWord.length; iChar++) {
		var cTemp = sWord.charAt(iChar);
		if ((cTemp == 'h') || (cTemp == 'j')) {
			for (var iHJ = 0; iHJ <= 4; iHJ++) {
				asOut.push(cTemp + iHJ);
			}
		} else if (cTemp == ' ') {
			asOut.push("_");
		} else {
			asOut.push(cTemp);
		}
	}
	return asOut;
}
/**
 * Initialize the animation.
 * This Buffers (creates animation frames and timing) and starts the animation.
 */
function animateWord(){
	bufferWord();
	showFrame();
}
/**
 * Run showLetterImage events after a given delay.
 */
function showFrame(){
	window.clearTimeout(g_intervalLetter);
	if(g_iFrameCurrent >= g_asFramePics.length){
		g_iFrameCurrent = 0;
		return;
	}
	var iLumin = g_aiFrameLumin[g_iFrameCurrent];
	if(iLumin != -1){
		showLumin(iLumin);
	}
	showLetterImage(g_asFramePics[g_iFrameCurrent]);
	var iNextInterval = g_aiFrameTimes[g_iFrameCurrent];
	g_intervalLetter = window.setInterval(function(){showFrame()}, iNextInterval);
	g_iFrameCurrent++;

	//console.log("repeats = " + g_iWordCurrentRepeats);
}
/**
 * Hilight the matching letter in answer to what is animating in the pictures
 * EG: When the "A" hands picture is being shown, the letter "a" is hilighted
 * in the answer. so the answer will show "s-a-nd". This does not run unless
 * the page is in answer mode.
 * @param iLetterToLumin Ix of the letter in the displayed answer area.
 */
function showLumin(iLetterToLumin){
	var sA = "";
	var isLetterLuminated = false;
	for(var iLet = 0; iLet < g_sWordCurrent.length; iLet++){
		if(iLet == iLetterToLumin){
			sA += "<span class=\"luminLetter\">";
			sA += g_sWordCurrent.charAt(iLet);
			sA += "</span>";
			isLetterLuminated = true;
		} else {
			sA += g_sWordCurrent.charAt(iLet);
		}
	}
	if(isLetterLuminated){
		sA = "<span class=\"luminLetterDull\">" + sA + "</span>";
	}
	showAnswer(sA);
}
/**
 * Present the image in the UI.
 * @param cCurr Letter to show. For example, 'a' will render "...img src=a.gif...".
 */
function showLetterImage(cCurr){
    cCurr.split(" ").join("_");
	ui.divImg.removeChild(ui.divImg.firstChild);
	var img = document.createElement("img");
	img.setAttribute("src" , "img/letter_" + cCurr + ".png");
	ui.divImg.appendChild(img);
}
/**
 * User has pressed the repeat button.
 * Do not run if nothing has been run yet.
 */
function doClickRepeat(){
	if(g_phase == PHASE_INIT){
		return;
	}
	g_iWordCurrentRepeats++;
	animateWord();
	flashClick(ui.btnRepeat);
    scoreboard.addRepeat();
}
/**
 * Move forward. This either means show the answer of the current
 * animation, or go to next word.
 */
function doClickForward(){
	g_iWordCurrentRepeats = 0;
	peekNextWord();
	if((g_phase == PHASE_INIT) || (g_phase == PHASE_ANSWER)){
		// It is just started or we are looking at the answer.
		document.getElementById("buttonRepeat").className = "buttonFunction";
		g_phase = PHASE_ANIM;
		getNextWord();
		showAnswer("");
		animateWord();
		ui.btnForward.innerHTML = "Answer";
	} else {
		showAnswer(g_sWordCurrent);
		g_phase = PHASE_ANSWER;
		ui.btnForward.innerHTML = "Next"
        scoreboard.addWord();
	}
	flashClick(ui.btnForward);
}
function flashClick(btn){
	btn.style.backgroundColor = "#bfcfff";
	setTimeout(function(){btn.style.backgroundColor = "#6C88DD";}, 200);
}
function clearCookies(){
	oCookie.deleteAll();
	setCookie(g_sIxWordCookieName);
	//setCookie(g_sIxWordListCookieName);
	document.location = document.location.href;
}
/**
 * Display the word being animated.
 * @param sAnswer
 */
function showAnswer(sAnswer){
	document.getElementById("answerDisplay").innerHTML = sAnswer.split("_").join(" ");
}
/**
 * Move to next word in word list.
 * This sometimes will mean moving to a new list.
 * It will eventually mean starting right back at the beginning.
 * @returns Next word, after updating all the array pointers to
 * word lists, and the words in them.
 */
function peekNextWord(sWordToPeek=null){
    if (sWordToPeek === null) {
        sWordToPeek = getNextWord(false);
    }
	cacheLetterImagesOnScreen(getLetterArrayFromWord(sWordToPeek));
}
function getNextWord(isUpdatePosition=true) {
//	if (typeof isUpdatePosition == "undefined") {
//		isUpdatePosition = true;
//	}
	var ixWordUpdated = g_ixWordCurrent + 1;
	//var ixWordListUpdated = g_ixWordListCurrent;
	//var asWordListUpdated = vocab.asList;
//	if (ixWordUpdated >= asWordListUpdated.length) {
	if (ixWordUpdated >= vocab.asList.length) {
		// Need to move to next list.
		ixWordUpdated = 0;
		//ixWordListUpdated = ixWordListUpdated + 1;
		//if(ixWordListUpdated >= vocab.asList.length){
		//	ixWordListUpdated = 0;
		//}
		//asWordListUpdated = vocab.asList[ixWordListUpdated];
		// We have changed word lists, update the list cookie.
		//if (isUpdatePosition) {
		//	vocab.asList = asWordListUpdated;
		//setCookie(g_sIxWordListCookieName, ixWordListUpdated);
	}
	var sWordCurrent = vocab.asList[ixWordUpdated];
	if (isUpdatePosition) {
		g_ixWordCurrent = ixWordUpdated;
//		g_ixWordListCurrent = ixWordListUpdated;
		g_sWordCurrent = vocab.asList[g_ixWordCurrent];
		setCookie(g_sIxWordCookieName, g_ixWordCurrent);
	}
	return sWordCurrent;
}
/**
 * Get the lists prepared.
 * This means putting them into the current word list array param.
 */
function initWordList(){
    /*
    g_asWordList = vocab.asList[g_ixWordListCurrent];
	for (var iW = 0; iW < g_asWordList.length; iW++) {
		g_asWordList[iW] = g_asWordList[iW].split(" ").join("_");
	}
	*/
}
/**
 * Prepare the alphabet letters, so that they are easily obtained by other functions.
 */
function showStartInfo(){
	var sOut = "<div class=\"startInfoText\">";
	var sContent = "Click on Next to start...<br/><div>Use arrow keys or space to run...</div>";
	if (g_isMediaW375) {
	    sContent = "<div class=\"startInfoText\">Click on Next to start...<br><div>Touch image to go next...</div>";
	}
	//sContent += "" + window.screen.width;
	sOut += sContent;
	sOut += "</div>";
	ui.divImg.innerHTML = sOut;
}
/**
 * Prepare the alphabet letters, so that they are easily obtained by
 * other functions.
 * Not used anymore, because peek function was created.
function initLetters(){
	var sLetters = "a,b,c,d,e,f,g,h0,h1,h2,h3,h4,i,j0,j1,j2,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z,_";
	var asLetters = sLetters.split(",");
	cacheLetterImagesOnScreen(asLetters);
}
 */
/**
 * Draw the letters in the cache div
 * @param asLetters
 * @returns
 */
function cacheLetterImagesOnScreen(asLetters) {
	var sOut = "";
	for (var iL = 0; iL < asLetters.length; iL++) {
		sOut += toImage(asLetters[iL]);
	}
	ui.divBuffer.innerHTML = sOut;
}
/**
 * Convert a letter to HTML for rendering.
 * Note: Some letters such as 'h' and 'j' are animated and have several parts.
 * @param sLetter The letter to be obtained. May have an index such as 'h2'.
 * @returns {String} HTML formatted image.
 */
function toImage(sLetter){
	return "<img src=\"img/letter_" + sLetter + ".png\"/>";
}

window.onkeydown = function(evt) {
	var key = evt.keyCode ? evt.keyCode : evt.which;
	/*
	 */
	if (key == 38) {
		// up
        evt.preventDefault();
		//trace("111 up");
		doClickFaster();
	} else if (key == 40) {
		// down
		evt.preventDefault();
		//trace("111 down");
		doClickSlower();
	} else if ((key == 32) || (key == 39)) {
		// 32=space 39=right.
		evt.preventDefault();
		doClickForward();
		//console.log("g_phase = " +  g_phase)
		console.warn("g_phase " + asPhaseKey[g_phase]);
		if (g_phase == PHASE_ANSWER) {
            setTimeout( function() {
                doClickForward();
            }, 1000 );
		}
	} else if (key == 37) {
		// left
		evt.preventDefault();
		//trace("111 left");
		doClickRepeat();
	}
	//trace();
	trace(key);
}

window.onkeyup = function(evt) {
	var key = evt.keyCode ? evt.keyCode : evt.which;
	/*
	 * This is NOT the function that does the work. THis is here to stop
	 * default behaviour when key comes up. Only a few need to be trapped.
	 * Only these ones have an effect on the UI.
	 * window.onkeydown() does the work.
	 */
	if ([32,37,38,39,40].includes(key)) {
        evt.preventDefault();
	}
	trace(key);
}

const scoreboard = {
    iWords: 0,
    iRepeats: 0,
    uiWords: 0,
    uiRepeats: 0,
    init: function() {
        this.uiWords = document.querySelector("#countWord");
        this.uiRepeats = document.querySelector("#countRepeat");
        this.updateUi();
    },
    addWord: function() {
        this.iWords++;
        this.updateUi();
    },
    addRepeat: function() {
        this.iRepeats++;
        this.updateUi();
    },
    reset: function() {
        this.iWords = 0;
        this.iRepeats = 0;
        this.updateUi();
    },
    updateUi: function() {
        this.uiWords.innerHTML = this.iWords;
        this.uiRepeats.innerHTML = this.iRepeats;
    }
}

const mediaQuery = window.matchMedia("(max-width: 768px)");
function handleMediaQueryChange(event) {
  // 'event.matches' is a boolean: true if the query matches, false otherwise
  g_isMediaW375 = (event.matches);
}
// Initial check when the script runs
handleMediaQueryChange(mediaQuery);

/**
 * Get it all ready.
 * Set up the ui references get speed from cookie and show speed etc.
 */
function doOnLoad(){
    oCookie.init();
	// Set up the UI elements for global use.
	ui.divSpeed = document.getElementById("divDisplay");
	ui.divDebug = document.getElementById("divDebug");
	ui.divImg = document.getElementById("imgDisplay");
	ui.divBuffer = document.getElementById("imgBuffer");
	ui.btnFaster = document.getElementById("buttonFaster");
	ui.btnSlower = document.getElementById("buttonSlower");
	ui.btnRepeat = document.getElementById("buttonRepeat");
	ui.btnForward = document.getElementById("buttonForward");
	// Display help information.
	showStartInfo();
	// Get cookie data, reset preferences.
	resumeSettings(); 
	// Initialize display.
	displaySpeed();
	initWordList();
	//initLetters();
	peekNextWord(" abcdefghijklmnopqrstuvwxyz");
	// Run any debugging stuff.
	if(g_isDebug){
		trace("doOnLoad() :: loading page");
		document.getElementById("debugClearCookies").style.display = "";
	}
	scoreboard.init();
}
