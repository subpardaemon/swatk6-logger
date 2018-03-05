const tstr = require('@swatk6/tester');

var tester = new tstr();

try {
    var loggr = require('./index.js');
    
    var logga = new loggr({keepLast:true,debugLevel:10});
    logga.setDebugLevel(11);
    logga.debuglevel(11,'should stay');
    logga.debuglevel(12,'should be none');
    var ent = logga.getEntries();
    if (ent.length!==1) {
	tester.addResponse('bad length',true,'bad length');
    }
    else if (typeof ent[0]['message']==='undefined') {
	tester.addResponse('bad format',true,'bad format');
    }
    else if (ent[0].message.indexOf('stay')===-1) {
	tester.addResponse('bad contents',true,'bad contents');
    }
    else {
	tester.addResponse(true,true,'all checks out');
    }
}
catch(e) {
    tester.addResponse(e,true,'exception');
}

if (tester.matchResponses([true])===false) {
    process.exit(1);
}

process.exit(0);
