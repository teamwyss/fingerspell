const vocabVowels = {
    vocab: [],
    iWordLength: 6,
    init: function() {
        this.vocab = this.generateVocab();
        return this;
    },
    generateVocab: function() {
        let asOut = [];
        let sChars = this.__getShuffledListOfChars__(360);
        let iRemain  = sChars.length;
        while (iRemain > 0) {
            let iGrab = Math.min(iRemain, this.iWordLength);
            let sThis = sChars.substring(0, iGrab);
            iRemain  = sChars.length;
            sChars = sChars.substring(iGrab);
            asOut.push(sThis);
        }
        return asOut;
    },
    __getShuffledListOfChars__: function(iCharCountOut) {
        let sOut = "ueoieoueauiouaoiueiuoeiuouaiaoueuoieuoeauiouaoieiuoeoiuaioueuoieoeaiaouaoiue";
        while (sOut.length < iCharCountOut) {
            // Make sure it is at least as long.
            sOut += sOut;
        }
        // Trim in case it went over.
        sOut = sOut.substring(0, iCharCountOut);
        return sOut;
    },
    __getShuffledListOfCharsComputeLiveRandom__: function(iCharCountOut) {
        /*                                                                  *
        *  This works great, but so much easier to use a seed like above.   *
        *  Keeping this because it has a great randomising function.        *
        *                                                                   */
        let acOut = "aaaeeeeeiiiiiiioooooooooouuu".split("");
        let currentIndex = acOut.length;

        // While there remain elements to __getShuffledListOfChars__...
        while (currentIndex != 0) {
            // Pick a remaining element...
            let randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            // And swap it with the current element.
            [acOut[currentIndex], acOut[randomIndex]] = [acOut[randomIndex], acOut[currentIndex]];
        }
        let cPrev = "X"; // impossible string;
        let acOutDeDoubled = [];
        for (let iC = 0; iC < acOut.length; iC++) {
            if (acOut[iC] !== cPrev) {
                acOutDeDoubled.push(acOut[iC]);
                cPrev = acOut[iC];
            }
        }
        let sOut = acOutDeDoubled.join("");
        while (sOut.length < iCharCountOut) {
            sOut += "" + sOut;
        }
        sOut = sOut.substring(0, iCharCountOut);
        return sOut;
    },
    debug: function(sUiOut) {
        let ui = document.querySelector(sUiOut);
        ui.innerHTML = this.vocab; //.join("<br/>");
    }
}