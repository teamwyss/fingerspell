
var g_isDebug = false;

var g_aiSpeeds = [2400,1800,1400,1100,900,700,500,300,180]; // Millis to show letter.
var g_ixSpeed = 4; // Index of the speed settings.
var g_iSpeed = g_aiSpeeds[g_ixSpeed]; // Speed in milis for letter.
var g_ixWordListCurrent = 0; // Which word-list is used
var g_ixWordCurrent = -1; // Which word in which word-list. Reset when starting;
var g_asWordList = ["not set"]; // List of words to show. Exploded from word-list.
var g_sWordCurrent = g_asWordList[0]; // Current word.

var g_iFrameCurrent = 0; // Current animation frame. Could be blank, a letter or part of a letter.
var g_asFramePics = new Array(); // List of frames to animate, eg ["_", "s", "i", "g", "n"]
var g_aiFrameTimes = new Array(); // List of the times each letter will show, eg [20, 1000, 1000, 1000, 1000]
var g_aiFrameLumin = new Array(); // The ix of current letter in answer.

var g_intervalLetter; // Window interval to manage timing.
var g_iPauseDurationMin = 50; // Between double letters pause. This is minimum millis.
//var g_iPauseDurationMax = 200; // Between double letters pause. This is minimum millis.

var g_divBuffer; // Invisible area to buffer/cache images.
var g_divDebug; // Developer debug area receiving trace messages.
var g_divSpeed; // Display of the current speed, eg "5".
var g_divImg; // Main letter image area.
var g_btnForward; // Forward button. Needs a reference because face value changes.
var g_btnFaster; // Back button.
var g_btnSlower; // Down button.
var g_btnRepeat; // Left button.

var PHASE_INIT = 0; // Just loaded, no action yet. No repeat possible.
var PHASE_ANIM = 1; // Running the animation.
var PHASE_ANSWER = 2; // Has run, and user has seen answer.
var g_phase = PHASE_INIT;

var g_sIxSpeedCookieName = "fingerSpell_ixCookieSpeed"; // Marker for ix of users chosen speed.
var g_sIxWordCookieName = "fingerSpell_ixWord"; // Marker for ix of word-list.
var g_sIxWordListCookieName = "fingerSpell_ixWordList"; // Marker for ix of word-list.

/**
 * Make anim run faster.
 */
function doClickFaster(){
	changeSpeed(1);
	flashClick(g_btnFaster);
}
/**
 * Make animm run slower.
 */
function doClickSlower(){
	changeSpeed(-1);
	flashClick(g_btnSlower);
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
		g_iSpeed = g_aiSpeeds[g_ixSpeed];
		displaySpeed();
	}
}
/**
 * Get chosen settings from cookies on open page.
 */
function resumeSettings(){
	// Resume Speed from cookie via its ix.
	g_ixSpeed = getCookieAsInt(g_sIxSpeedCookieName, 4);
	g_ixSpeed = Math.min((g_aiSpeeds.length - 1), g_ixSpeed);
	g_iSpeed = g_aiSpeeds[g_ixSpeed];
	// Resume Word-List from cookie via its ix.
	g_ixWordListCurrent = getCookieAsInt(g_sIxWordListCookieName, 0);
	g_ixWordListCurrent = Math.min((aasWordLists.length - 1), g_ixWordListCurrent);
	// Resume Word from cookie via its ix.
	var dt = new Date();
	g_ixWordCurrent = getCookieAsInt(g_sIxWordCookieName, dt.getSeconds());
	g_ixWordCurrent = Math.min((aasWordLists[g_ixWordListCurrent].length - 1), g_ixWordCurrent);
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
	g_divSpeed.innerHTML = (g_ixSpeed + 1);
}
/**
 * Debugging message.
 * @param sOut Message to display.
 */
function trace(sOut){
	if(g_isDebug){
		var sVal = "";
		if(typeof sOut != "undefined"){
			sVal = g_divDebug.innerHTML + sOut + "<br/>";
		}
		g_divDebug.innerHTML = sVal;
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
			asFramePicsForThisLetter = "h0,h1,h2,h3,h4,h4,h4".split(",");
		} else if(cCurr == 'j'){
			asFramePicsForThisLetter = "j0,j1,j2,j2,j2".split(",");
		}
		var iNumberOfParts = asFramePicsForThisLetter.length;
		var iSpeedPart = Math.round(g_iSpeed / iNumberOfParts);
		for ( var iP = 0; iP < iNumberOfParts; iP++) {
			g_asFramePics[g_asFramePics.length] = asFramePicsForThisLetter[iP];
			g_aiFrameTimes[g_aiFrameTimes.length] = iSpeedPart;
			g_aiFrameLumin[g_aiFrameLumin.length] = isShowLumin ? iC : -1;
		}
	}
	g_asFramePics[g_asFramePics.length] = "-";
	g_aiFrameTimes[g_aiFrameTimes.length] = 0;
	g_aiFrameLumin[g_aiFrameLumin.length] = isShowLumin ? 100 : -1; // Past last letter.
	var sOut = "";
	for ( var iWL = 0; iWL < g_asFramePics.length; iWL++) {
		sOut += "<br/>letter: " + g_asFramePics[iWL] + " will show for " + g_aiFrameTimes[iWL] + " millis";
	}
	trace(sOut);
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
	g_divImg.innerHTML = toImage(cCurr);
}
/**
 * User has pressed the repeat button.
 * Do not run if nothing has been run yet.
 */
function doClickRepeat(){
	if(g_phase == PHASE_INIT){
		return;
	}
	animateWord();
	flashClick(g_btnRepeat);
}
/**
 * Move forward. This either means show the answer of the current 
 * animation, or go to next word.
 */
function doClickForward(){
	if((g_phase == PHASE_INIT) || (g_phase == PHASE_ANSWER)){
		// It is just started or we are looking at the answer.
		document.getElementById("buttonRepeat").className = "buttonFunction";
		g_phase = PHASE_ANIM;
		getNextWord();
		showAnswer("");
		animateWord();
		g_btnForward.innerHTML = "Answer";
	} else {
		showAnswer(g_sWordCurrent);
		g_phase = PHASE_ANSWER;
		g_btnForward.innerHTML = "Next"
	}
	flashClick(g_btnForward);
}
function flashClick(btn){
	btn.style.backgroundColor = "#849fe0";
	setTimeout(function(){btn.style.backgroundColor = "white";}, 200);
}
function clearCookies(){
	setCookie(g_sIxSpeedCookieName);
	setCookie(g_sIxWordCookieName);
	setCookie(g_sIxWordListCookieName);
	document.location = document.location.href;
}
/**
 * Display the word being animated.
 * @param sAnswer
 */
function showAnswer(sAnswer){
	document.getElementById("answerDisplay").innerHTML = sAnswer;
}
/**
 * Move to next word in word list.
 * This sometimes will mean moving to a new list.
 * It will eventually mean starting right back at the beginning.
 * @returns Next word, after updating all the array pointers to
 * word lists, and the words in them.
 */
function getNextWord(){
	g_ixWordCurrent++;
	if(g_ixWordCurrent >= g_asWordList.length){
		// Need to move to next list.
		g_ixWordCurrent = 0;
		g_ixWordListCurrent++;
		if(g_ixWordListCurrent >= aasWordLists.length){
			g_ixWordListCurrent = 0;
		}
		g_asWordList = aasWordLists[g_ixWordListCurrent];
		// We have changed word lists, update the list cookie.
		setCookie(g_sIxWordListCookieName, g_ixWordListCurrent);
	}
	g_sWordCurrent = g_asWordList[g_ixWordCurrent];
	setCookie(g_sIxWordCookieName, g_ixWordCurrent);
	return g_sWordCurrent;
}
/**
 * Get the lists prepared.
 * This means putting them into the current word list array param.
 */
function initWordList(){
	g_asWordList = aasWordLists[g_ixWordListCurrent];
	for (var iW = 0; iW < g_asWordList.length; iW++) {
		g_asWordList[iW] = g_asWordList[iW].split(" ").join("_");
	}
}
/**
 * Prepare the alphabet letters, so that they are easily obtained by
 * other functions.
 */
function showStartInfo(){
	var sOut = "<div class=\"startInfoText\">Click on Next to start...<br><div>Use arrow keys or space to run...</div></div>";
	g_divImg.innerHTML = sOut;
}
/**
 * Prepare the alphabet letters, so that they are easily obtained by
 * other functions.
 */
function initLetters(){
	var sOut = "";
	var sLetters = "a,b,c,d,e,f,g,h0,h1,h2,h3,h4,i,j0,j1,j2,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z,_";
	var asLetters = sLetters.split(",");
	for (var iL = 0; iL < asLetters.length; iL++) {
		sOut += toImage(asLetters[iL]);
	}
	g_divBuffer.innerHTML = sOut;
}
/**
 * Convert a letter to HTML for rendering.
 * Note: Some letters such as 'h' and 'j' are animated and have several parts.
 * @param sLetter The letter to be obtained. May have an index such as 'h2'.
 * @returns {String} HTML formatted image.
 */
function toImage(sLetter){
	return "<img src=\"img/letter_" + sLetter + ".jpg\"/>";
}

window.onkeyup = function(e) {
	var key = e.keyCode ? e.keyCode : e.which;
	/*
	 */
	if (key == 38) {
		// up
		trace("up");
		doClickFaster();
	} else if (key == 40) {
		// down
		trace("down");
		doClickSlower();
	} else if ((key == 32) || (key == 39)) {
		// right
		trace("right or space");
		doClickForward();
	} else if (key == 37) {
		// left
		trace("left");
		doClickRepeat();
	}
	//trace();
	trace(key);
}
/**
 * Get it all ready.
 * Set up the ui references get speed from cookie and show speed etc.
 */
function doOnLoad(){
	// Set up the UI elements for global use.
	g_divSpeed = document.getElementById("speedDisplay");
	g_divDebug = document.getElementById("debugDisplay");
	g_divImg = document.getElementById("imgDisplay");
	g_divBuffer = document.getElementById("imgBuffer");
	g_btnFaster = document.getElementById("buttonFaster");
	g_btnSlower = document.getElementById("buttonSlower");
	g_btnRepeat = document.getElementById("buttonRepeat");
	g_btnForward = document.getElementById("buttonForward");
	// Display help information.
	showStartInfo();
	// Get cookie data, reset preferences.
	resumeSettings(); 
	// Initialize display.
	displaySpeed();
	initWordList();
	initLetters();
	// Run any debugging stuff.
	if(g_isDebug){
		trace("doOnLoad() :: loading page");
		document.getElementById("debugClearCookies").style.display = "";
	}
}
