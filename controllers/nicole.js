var nicole = function(kiel){
	
	return {
		get : {
			index : function(res,req) {
				var data = {
					content : "Enlightened"
				};

				kiel.response(req, res, {data : data}, 200);
			},

			enlighten : function(req,res) {
				
				var data = {
					date : "February - Present",
					content : "TmlpaS4uISBob3cgbG9uZyBoYXMgaXQgYmVlbi4uPyA2bW9udGhzLi4/IGhhbGYgeWVhciBuYSB1bi4uISB0YXBvcyBhbml2IG5hIG5hdGluLi4hIDoqIHllcyBhbmcgZGFtaSBrbyBwYWdrdWt1bGFuZyANCnNhdS4uYW5kIGltIHNvcnJ5Li4uYnV0IEkganVzdCB3YW50IHlvdSB0byBrbm93IG5hIEknbSByZWFsbHkgcmVhbGx5IG1hZGx5IGRlZXBseSBzdXBlciBpbmxvdmUgd2l0aCB5b3UuLiA6KSAgaXRzIGxpa2UgdGhlcmUncyB0aGlzIA0KcGVyc29uIGluIG15IGxpZmUgbmEgZ3VzdG8ga28gbGFnaW5nIHBhc2F5aW4gYW5kIGFsYWdhYW4uLnRoYXQncyB5b3UuLiEgOlAgbmkuLiBhbGwgdGhpcyB0aW1lLi5pa2F3IGxuZyB0bGFnYSB1bmcgYmFiYWUgbmEgZ3VzdG8ga29uZyBtYWthc2FtYS4uIGFuZCBzb21lZGF5Li5pIGhvcGUgdG8gbWFycnkgeW91Li4gOikgYW5kIHdlIHdpbGwgYnVpbGQgdW5nIGZhbWlseSBuYSBndXN0byBtby4uIDoqIA0KDQp0aGVyZSBhcmUgaHVyZGxlcyBhbmQgZXZlcnl0aGluZyBidXQgc2FuYSBtYXVuYXdhYW4gbW8gbmEgcGFydCB5dW4gbmcgcmVsYXRpb25zaGlwIG5hdGluLiBtYWdtYW1hdHVyZSBkaW4gdGF1Li4gOikgdGhlcmUgbWlnaHQgY29tZSBhIHRpbWUgbmEgYWthbGEgbmF0aW4gbmF3YXdhbGEgdW5nIHN3ZWV0bmVzcywgdW5nIHBhZ21hbWFoYWwgbmF0aW4uLmJ1dCB0aGUgdHJ1dGggaXMuLm5hamFuIGxhbmcgeXVuLi5iYWthIG5hIHRhdGFrZSBmb3IgZ3JhbnRlZCBsYW5nIG5hdGluIGtheWEgbmQgbmF0aW4gbWFraXRhLi5sb29rIGF0IHRoZSBsaXR0bGUgdGhpbmdzLi4geXVuZyBtZ2Egc2ltcGxlbmcgaHVncy4ueXVuZyBtZ2EgdHh0IGtvLi5tZ2EgY2hhdCBrby4ua2hpdCBzaW1wbGUgbG5nIHNpbGEuLml0cyBiZWNhdXNlIGkgbG92ZSB5b3Uga2F5YSBrbyBnbmd3YSB1bi4uICANCg0KbmkuLiBpIGp1c3Qgd2lzaCBuYSBrb250aW5nIHBhc2Vuc3lhIGF0IHBhbmd1bmF3YSBsYW5nLi5rdW5nIG1lam8gd2FsYW5nIGt3ZW50YSB1bmcgYmYgbW8gbmEgaGluZGkga2EgbmFiYmd5YW4gbmcgb3Jhcy4uaXRzIGp1c3QgaW0gYnVpbGRpbmcgYSBmdXR1cmUgZm9yIHVzIDopIHBhcmEgcGFnIGRhdGluZyBuZyBhcmF3LCBtYXBhZ2F3YSBuYXRpbiB1bmcgZHJlYW0gaG91c2UgbmF0aW4uLm1haXRheW8gbmF0aW4gdW5nIGRyZWFtIGZhbWlseSBtby4uaSBsb3ZlIHlvdSBuaSA6KiB5b3Uga25vdyB0aGF0Li5raGl0IG1ha2FraXRhIGFrbyBuZyBpYmEuLmlrYXcgcGEgZGluIHVuZyBoYWhhbmFwaW4ga28uLndvcmRzIGNhbnQgZXhwcmVzcy4uaSB3aWxsIGp1c3QgbWFrZSB5b3UgZmVlbCBob3cgc3BlY2lhbCB5b3UgYXJlIHRvIG1lLi4gOiogdG8gbXkgZGVhcmVzdCBuaS4uIGhhcGkgNi4uISBpIGxvdmUgeW91IHNvIG11Y2guLiEgOio=",
					encoded : true
				};

				kiel.logger("Finised exectuing users",'access');
				//example in acessing the response
				kiel.response(req, res, {data : data}, 200);
			}
		},

		post : {
			index : function(res,req) {
				return;
			}
		}, 

		put : {

		},

		delete : {

		}
	}
}

module.exports = nicole;