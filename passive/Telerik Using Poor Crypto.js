// This community script will check if a request is made to the Telerik
// DialogHandler using poor cryptography (CVE-2017-9248)

// (c) 2017 Harrison Neal
// http://www.apache.org/licenses/LICENSE-2.0

function scan(ps, msg, src) {
	var alertRisk = org.parosproxy.paros.core.scanner.Alert.RISK_HIGH;
	var alertTitle = "Telerik UI for ASP.NET AJAX CVE-2017-9248 Cryptographic Weakness";
	var alertDesc = "A request has been made that appears to conform to poor cryptography used by Telerik UI for ASP.NET AJAX prior to v2017.2.621.  An attacker could manipulate the value of the dp parameter to possibly learn the machine key and upload arbitrary files, which could then lead to the compromise of ASP.NET ViewStates and arbitrary code execution respectively.  CVE-2017-9248 has a CVSSv3 score of 9.8.  ";
	var alertSolution = "See http://www.telerik.com/support/kb/aspnet-ajax/details/cryptographic-weakness for update/mitigation guidance."
	var cweId = 327;
	var wascId = 0;
	var url = msg.getRequestHeader().getURI().toString();
	var param = "dp";
	
	var dp = null;
	
	for (var iterator = msg.getUrlParams().iterator(); iterator.hasNext();) {
		var urlParam = iterator.next();
		
		if (urlParam.getName() == param) {
			dp = urlParam.getValue();
			break;
		}
	}
	
	if (dp == null) {
		return;
	}
	
	if (!org.apache.commons.codec.binary.Base64.isBase64(dp)) {
		return;
	}
	
	var dpBytes = org.apache.commons.codec.binary.Base64.decodeBase64(dp);
	
	if (dpBytes.length < 48) {
		return;
	}
	
	for (var dpByteIdx = 0; dpByteIdx < dpBytes.length; dpByteIdx++) {
		if (!(dpBytes[dpByteIdx] >= 0 && dpBytes[dpByteIdx] <= 127)) {
			return;
		}
	}
	
	var foundComma = 0;
	var foundSemicolon = 0;
	
	for (var blockStart = 0; blockStart < 48; blockStart += 4) {
		var keyPossibilities1 = new Array(4);
		var thisBlockAppearsValid = 0;
		
		for (var keyIdx = 0; keyIdx < 4; keyIdx++) {
			keyPossibilities1[keyIdx] = new Array(96);
			for (var possibleIdx = 0; possibleIdx < 96; possibleIdx++) {
				keyPossibilities1[keyIdx][possibleIdx] = 1;
			}
			
			for (dpByteIdx = blockStart + keyIdx; dpByteIdx < dpBytes.length; dpByteIdx += 48) {
				for (possibleIdx = 0; possibleIdx < 96; possibleIdx++) {
					var ctx = dpBytes[dpByteIdx];
					var key = possibleIdx + 32;
					var xor = ctx ^ key;
					var chr = String.fromCharCode(xor);

					if (!org.apache.commons.codec.binary.Base64.isBase64(chr)) {
						keyPossibilities1[keyIdx][possibleIdx] = 0;
					}
				}
			}
		}
		
		var keyPossibilities2 = new Array();
		
		for (var key0Idx = 0; key0Idx < 96; key0Idx++) {
			if (keyPossibilities1[0][key0Idx] == 0) {
				continue;
			}
			
			for (var key1Idx = 0; key1Idx < 96; key1Idx++) {
				if (keyPossibilities1[1][key1Idx] == 0) {
					continue;
				}
				
				for (var key2Idx = 0; key2Idx < 96; key2Idx++) {
					if (keyPossibilities1[2][key2Idx] == 0) {
						continue;
					}
					
					for (var key3Idx = 0; key3Idx < 96; key3Idx++) {
						if (keyPossibilities1[3][key3Idx] == 0) {
							continue;
						}
						
						keyPossibilities2.push([key0Idx + 32, key1Idx + 32, key2Idx + 32, key3Idx + 32]);
					}
				}
			}
		}
		
		for (possibleIdx = 0; possibleIdx < keyPossibilities2.length; possibleIdx++) {
			var thisKeyValidSoFar = 1;
			var thisKeyFoundComma = 0;
			var thisKeyFoundSemicolon = 0;
			
			for (var blockOffset = 0; blockOffset + blockStart + 4 <= dpBytes.length; blockOffset += 48) {
				var ptBase64 = "";
				for (var byteIdx = 0; byteIdx < 4; byteIdx++) {
					ctx = dpBytes[blockOffset + blockStart + byteIdx];
					key = keyPossibilities2[possibleIdx][byteIdx];
					xor = ctx ^ key;
					chr = String.fromCharCode(xor);

					ptBase64 += chr;
				}
	
				var pt = org.apache.commons.codec.binary.Base64.decodeBase64(ptBase64);
				
				for (byteIdx = 0; byteIdx < pt.length; byteIdx++) {
					if (!(pt[byteIdx] >= 32 && pt[byteIdx] <= 127)) {
						thisKeyValidSoFar = 0;
						break;
					}
					
					if (pt[byteIdx] == 44) {
						thisKeyFoundComma = 1;
					}
					
					if (pt[byteIdx] == 59) {
						thisKeyFoundSemicolon = 1;
					}
				}
				if (thisKeyValidSoFar == 0) {
					break;
				}
			}
			
			if (thisKeyValidSoFar == 1) {
				thisBlockAppearsValid = 1;
				
				if (thisKeyFoundComma == 1) {
					foundComma = 1;
				}
				
				if (thisKeyFoundSemicolon == 1) {
					foundSemicolon = 1;
				}
			}
		}
		
		if (thisBlockAppearsValid == 0) {
			return;
		}
	}
	
	if (foundComma == 0 || foundSemicolon == 0) {
		return;
	}
	
	var alertConfidence = null;
	
	if (url.contains("DialogHandler.aspx")) {
		alertConfidence = org.parosproxy.paros.core.scanner.Alert.CONFIDENCE_HIGH;
		alertDesc += "The URI strongly suggests this is a Telerik.Web.UI.DialogHandler instance; confidence is HIGH.";
	} else {
		alertConfidence = org.parosproxy.paros.core.scanner.Alert.CONFIDENCE_MEDIUM;
		alertDesc += "The URI is not typical for a Telerik.Web.UI.DialogHandler instance, so it may have been changed (e.g., in web.config), or this may be a false positive; confidence is MEDIUM.";
	}

	alertDesc = alertDesc.split("  ").join(java.lang.System.getProperty("line.separator"));
	
	ps.raiseAlert(alertRisk, alertConfidence, alertTitle, alertDesc, url, param, '', '', alertSolution, '', cweId, wascId, msg);
}
