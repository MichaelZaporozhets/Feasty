global.$ = $;

var gui = require('nw.gui');

// Extend application menu for Mac OS
if (process.platform == "darwin") {
	var menu = new gui.Menu({type: "menubar"});
	menu.createMacBuiltin && menu.createMacBuiltin(window.document.title);
	gui.Window.get().menu = menu;
};

var config = {
	partners : {
		ml : false,
		dh : false,
		fd : false,
	}
}

var Feasty = function() {
	var feasty = this;

	feasty.setProgress = function(pcnt) {
		$('.progressBar').css('width', pcnt+'%');
	}

	feasty.log = function(msg) {
		// $('.log').append('<p>'+msg+'</p>');
		console.log(msg)
	}

	feasty.Category = function(name) {
		this.name = name;
	}

	feasty.Store = function() {
		var store = this;

		store.name = '';
		store.rating = 0;
		store.categories = [];
		store.source = '';
		store.url;
		store.originalData = {};

		store.el = false;

		store.updateRating = function() {
			if(store.el) {
				var stars = store.el.find('.rating');

				stars.empty();

				for(i = 0; i < Math.round(store.rating); i++) {
					stars.append('<span class="glyphicon glyphicon-star" aria-hidden="true"></span>');
				}

				store.el.data('rating', store.rating);
			}
		}
	}

	feasty.categories = {};
	feasty.stores = {};

	feasty.buildLists = function() {
		$('.combined .stores').empty();
		for(i in feasty.stores) {
			store = feasty.stores[i];

			var li = $('<li class="list-group-item"></li>');

			li.attr('data-openNow', store.openNow);
			li.attr('data-category', store.categories)
			li.attr('data-rating', Math.round(store.rating));
			li.attr('data-source', store.source);

			//source
			li.append('<span class="label source">'+store.source+'</span>');

			//titlelink
			li.append('<a href="#" data-href="'+store.url+'" target="_blank" class="name">'+store.name+'</a>');

			//stars
			var stars = $('<span class="rating pull-right"></span>');
			for(i = 0; i < Math.round(store.rating); i++) {
				stars.append('<span class="glyphicon glyphicon-star" aria-hidden="true"></span>');
			}

			li.append(stars);

			$('.combined .stores').append(li);

			store.el = li;
		}

		for(i in feasty.categories) {
			$('.combined .categories').append('<li class="list-group-item">'+feasty.categories[i].name+'</li>');
		}
	}

	feasty.gmap = function() {
		var gmap = this;

		gmap.gmapPlace = false;
		gmap.foundPostCode = false;
		gmap.placeSearch = false;
		gmap.autocomplete = false;

		gmap.initAutocomplete = function() {
			// Create the autocomplete object, restricting the search to geographical
			// location types.
			autocomplete = new google.maps.places.Autocomplete(
					/** @type {!HTMLInputElement} */(document.getElementById('autocomplete')),
					{types: ['geocode']});

			// When the user selects an address from the dropdown, populate the address
			// fields in the form.
			autocomplete.addListener('place_changed', function() {
				var place = autocomplete.getPlace();
				gmap.gmapPlace = place;

				for(i in place.address_components) {
					var component = place.address_components[i];

					if(component.types[0] == 'postal_code') {
						gmap.foundPostCode =component.short_name;
					}
				}
			});
		}

		gmap.getGoogleRating = function(lat, lng, name, cb) {
			var spot = new google.maps.LatLng(lat, lng);

			var map = new google.maps.Map(document.createElement('div'), {
				center: spot,
				zoom: 15,
				scrollwheel: false
			});

			// Specify location, radius and place types for your Places API search.
			var request = {
				location: spot,
				radius: '1000',
				types: ['restaurant', 'store'],
				name: name
			};

			// Create the PlaceService and send the request.
			// Handle the callback with an anonymous function.
			var service = new google.maps.places.PlacesService(map);
			service.nearbySearch(request, function(results, status) {
				if (status == google.maps.places.PlacesServiceStatus.OK) {
					for (var i = 0; i < results.length; i++) {
						var place = results[i];

						var request = { reference: place.reference };
						service.getDetails(request, function(details, status) {

							var avg = 0;
							var sum = 0;
							if(details && details.reviews) {
								for(i in details.reviews) {
									if(details.reviews[i].rating) sum+= details.reviews[i].rating;
								}

								avg = sum/details.reviews.length;

							}

							cb(avg);
						});
					}
				}
			});
		}

		gmap.init = function() {
			gmap.initAutocomplete();
		}
	}

	feasty.partners = {
		foodora : function() {
			var foodora = this;

			foodora.data = {};

			foodora.getData = function(cb) {
				var lat = feasty.gmap.gmapPlace.geometry.location.lat();
				var lng = feasty.gmap.gmapPlace.geometry.location.lng()

				if(config.partners.fd) {
					feasty.log('foodora data: start');

					gui.Window.open("https://www.foodora.com.au/api/v1/vendors/?cuisine=&food_characteristic=&budgets=&latitude=" + lat + "&longitude=" + lng, {
						position: 'center',
						width: 1,
						height: 1
					}, function(win) {
						win.hide();
						win.on('loaded', function(){
							// the native onload event has just occurred
							foodora.data = JSON.parse(win.window.document.body.children[0].innerHTML);

							win.window.close();
							feasty.log('foodora data: complete');

							cb();
						});
					});
				} else {
					cb();
				}
			}

			foodora.getFoodoraRating = function(foodoraStore, i) {
				//1000 calls a day lol cheers zomato
				// var getRatingZMRating = function(name, lat, lng) {
				// 	var req = {
				// 		url: "https://developers.zomato.com/api/v2.1/search?q="+name+"&lat="+lat+"&lon="+lng+"&radius=100",
				// 		headers: {
				// 			'Accept': "application/json",
				// 			'user_key': "468a5fab83480a16a45da1284a08c94a"
				// 		},
				// 		method: 'GET',
				// 		success: function(data){
				// 			feasty.log(data.restaurants[0].restaurant.user_rating.aggregate_rating)
				// 		}
				// 	};

				// 	$.ajax(req);
				// }

				setTimeout(function() {
					feasty.gmap.getGoogleRating(foodoraStore.latitude, foodoraStore.longitude, foodoraStore.name, function(rating) {
						feasty.stores[foodora.data[i].name + '-foodora'].rating = rating;
						feasty.stores[foodora.data[i].name + '-foodora'].updateRating();
					});
				}, 1000*i);
			}

			foodora.getFoodoraRatings = function(cb) {
				$('.combined .stores li[data-source="foodora"] .rating').html('loading...');
				feasty.log('foodora ratings: started');
				for(i in foodora.data) {
					var foodoraStore = foodora.data[i]

					foodora.getFoodoraRating(foodoraStore, i);
				}

				setTimeout(function() {
					feasty.log('foodora ratings: complete');
					if(cb) cb();
				}, (1000*foodora.data.length)+500)
			}

			foodora.split = function() {
				var stores = foodora.data;

				for(i in stores) {
					var store = new feasty.Store();

					store.name = stores[i].name;
					store.rating = stores[i].rating;
					
					for(cuisine in stores[i].cuisines) {
						var categoryName = stores[i].cuisines[cuisine].name.toLowerCase();
						if(!feasty.categories[categoryName]) {
							feasty.categories[categoryName] = new feasty.Category(categoryName);
						}
						store.categories.push(stores[i].cuisines[cuisine].name.toLowerCase());
					}

					store.source = 'foodora';
					store.url = stores[i].web_path;
					store.openNow = stores[i].metadata.available_in ? false : true;
					store.originalData = stores[i];

					feasty.stores[store.name + '-foodora'] = store;
				}
			}
		},
		deliveryhero : function() {
			var deliveryhero = this;

			deliveryhero.data = {};

			deliveryhero.getData = function(cb, postcode) {
				if(config.partners.dh) {
					feasty.log('deliveryhero data: start');
					
					gui.Window.open("https://www.deliveryhero.com.au/takeaway-melbourne/melbourne/", {
						position: 'center',
						width: 1,
						height: 1
					}, function(win) {
						win.hide();
						win.on('loaded', function() {
							window.nwwin = win;

							setTimeout(function() {
								var finderInt = false;
								var stage = 0;
								finderInt = setInterval(function() {
									//stage 1
									if(stage == 0) {
										if(win.window.document && $(win.window.document.body).find('.categories-container .categories ul.categories__chooser li a').size()) {
											stage = 1;
											win.window.fetch = function(param, param2, param3) { win.window.dhfetches.push([param, param2, param3]); return new Promise(function(resolve, reject) { } ); }
											nwwin.window.location = "javascript:$('.categories-container .categories ul.categories__chooser li a').eq(0).click();";
										}
									}

									if(stage == 1) {
										if(win.window.dhfetches && win.window.dhfetches.length) {
											stage = 2;
											var dhfetches = win.window.dhfetches;

											var url = dhfetches[0][0];

											var host = url.split('?')[0];
											var urlParams = url.split('?')[1];

											urlParams = urlParams.replace('city=melbourne&district=melbourne&', '');
												
											urlParams = urlParams.split('&');

											var postcodeLocation = function() {
												for(i in urlParams) {
													if(urlParams[i].toString().indexOf('zipcode') > -1) return parseInt(i);
												}
											}();

											if(postcodeLocation) {
												urlParams[postcodeLocation] = 'zipcode='+postcode;
											} else {
												urlParams.push('zipcode='+postcode)
											}

											urlParams = urlParams.join('&');

											url = host + '?' + urlParams;

											var req = {
												url: url,
												headers: {
													'Accept': "application/vnd.deliveryhero.v2.7+json",
													'Accept-Language':"en-AU",
													'Authentication': dhfetches[0][1].headers[0][1]
												},
												method: 'GET',
												success: function(data){
													deliveryhero.data = data.data;
													clearInterval(finderInt);
													win.window.close();
													feasty.log('deliveryhero data: complete');
													cb();
												}
											};

											win.window.$.ajax(req);
										}
									}
								},500);
							}, 1000);
						});

						win.on('document-start', function() {
							win.window.dhfetches = [];
						});

						win.on('document-end', function() {

						});
					});
				} else {
					cb();
				}
			}

			deliveryhero.split = function() {
				var stores = deliveryhero.data;

				for(i in stores) {
					var store = new feasty.Store();

					store.name = stores[i].general.name;
					store.rating = stores[i].rating.average;
					
					for(category in stores[i].general.categories) {
						var categoryName = stores[i].general.categories[category].toLowerCase()
						if(!feasty.categories[categoryName]) {
							feasty.categories[categoryName] = new feasty.Category(categoryName);
						}
						store.categories.push(stores[i].general.categories[category].toLowerCase());
					}

					store.source = 'deliveryhero';
					store.url = 'http://deliveryhero.com.au/takeaway-melbourne/melbourne/restaurant-'+stores[i].general.nurl+'/'+stores[i].id
					store.openNow = stores[i].general.open;
					store.originalData = stores[i];

					feasty.stores[store.name + '-deliveryhero'] = store;
				}
			}
		},
		menulog : function() {
			var menulog = this;

			menulog.data = {};

			menulog.getData = function(cb, postcode) {
				if(config.partners.ml) {
					feasty.log('menulog data: start');
					gui.Window.open("https://service-iphone.menulog.com.au/Service.svc/v20/DeliveryKW/AUS/"+postcode+"/0000/ac6b578e50c23687df26497ede8a9286", {
						position: 'center',
						width: 1,
						height: 1
					}, function(win) {
						win.hide();
						win.on('loaded', function(){
							// the native onload event has just occurred
							menulog.data = JSON.parse(win.window.document.body.children[0].innerHTML);

							win.window.close();
							feasty.log('menulog data: complete');
							cb();
						});
					});
				} else {
					cb();
				}
			}

			menulog.split = function() {
				var stores = menulog.data.VenueList;

				for(i in stores) {
					var store = new feasty.Store();

					store.name = stores[i].RestaurantName;
					store.rating = stores[i].ConsumerRating;
					
					for(cuisine in stores[i].Cuisines) {
						var categoryName = stores[i].Cuisines[cuisine].CuisineName.toLowerCase();
						if(!feasty.categories[categoryName]) {
							feasty.categories[categoryName] = new feasty.Category(categoryName);
						}
						store.categories.push(stores[i].Cuisines[cuisine].CuisineName.toLowerCase());
					}

					store.source = 'menulog';
					store.url = stores[i].RestaurantUrl;
					store.openNow = stores[i].OpenStatus == 'Closed' ? false : true;
					store.originalData = stores[i];

					feasty.stores[store.name + '-menulog'] = store;
				}
			}
		}
	}

	feasty.sortCategoriesByName = function() {
		$('.combined .categories').children().detach().sort(function(a, b) {
			return $(a).text().localeCompare($(b).text());
		}).appendTo($('.combined .categories'));
	}

	feasty.sortStoresByName = function() {
		$('.combined .stores').children().detach().sort(function(a, b) {
			return $(a).children('.name').text().localeCompare($(b).children('.name').text());
		}).appendTo($('.combined .stores'));
	}

	feasty.sortStoresByRating = function() {
		$('.combined .stores').children().detach().sort(function(a, b) {
			return $(b).data('rating').toString().localeCompare($(a).data('rating').toString());
		}).appendTo($('.combined .stores'));
	}

	feasty.interface = function() {
		$('.information').click(function() {
			gui.Window.get().reload();
		});

		//interactions
		$('.combined .categories li').click(function() {
			var _$this = $(this);

			$('.combined .stores li').css('display','').removeClass('filteredOut');

			if(!$(this).hasClass('active')) {
				_$this.siblings().removeClass('active');
				_$this.addClass('active');

				$('.combined .stores li').css('display','').each(function() {
					if($(this).data('category').indexOf(_$this.text().toLowerCase()) < 0) {
						$(this).addClass('filteredOut');
					}
				});
			} else {
				_$this.removeClass('active');
			}
		});

		$('.combined .stores li').click(function(e) {
			e.preventDefault();

			var _$this = $(this);

			_$this.siblings().removeClass('active');
			_$this.addClass('active');

			$('.storeView').show();

			$('.storeContainer .loading').show();
			$('.storeContainer .ready').hide();

			$('iframe').attr('src', $(this).children('a').data('href'));
			$('iframe')[0].addEventListener('load', function() {
				$('.storeContainer h3').text(_$this.children('a').text());

				//get rid of delivery hero fluff
				$($('iframe')[0].contentWindow.document.body).append('<style>.grid { min-width: 100%; padding: 0rem; } .inner-header .inner-grid { min-height: 38em; } .on-top { margin-top: 0rem; } .hp-header,.inner-header, .icon-arrow-left.back-link, #breadcrumbs, footer { display: none!important; }</style>')
				
				$('.storeContainer .ready').show();
				$('.storeContainer .loading').hide();
			}, false);
		});

		$('.storesOrderBy.dropdown').each(function() {
			$container = $(this);
			$btn = $container.find('button');
			$container.find('ul a').click(function() {
				$btn.find('.title').text($(this).text());

				if($(this).hasClass('orderByName')) {
					feasty.sortStoresByName();
					$container.attr('data-orderby', 'name');
				}

				if($(this).hasClass('orderByRating')) {
					feasty.sortStoresByRating();
					$container.attr('data-orderby', 'rating');
				}
			});
		});

		$('.storesOrderBy.dropdown ul a.orderByRating').click();



		$('.searchUl').each(function() {
			var _$this = $(this);
			var target = $($(this).data('target'));


			_$this.on('keyup', function() {
				target.find('li').each(function() {
					if($(this).text().toLowerCase().indexOf(_$this.val().toLowerCase()) < 0 && _$this.val() !== '') {
						$(this).hide();
					} else {
						$(this).css('display','')
					}
				});
			});
		});

		$('.checkbox').find('input').on('change', function() {
			if($(this)[0].checked == true) {
				$('.storesContainer ul.stores li').removeClass('forceShow');
			} else {
				$('.storesContainer ul.stores li').addClass('forceShow');
			}
		});


		$('.refresh').click(function() {
			$('.loading').show();
			$('.ready').hide();
			gui.Window.get().reload();
		});


		$('.loading').hide();
		$('.log').hide();
		$('.information').show();
		$('.ready').show();
	}

	feasty.setInfo = function(postcode) {
		var infoText = 'Showing stores in ' + postcodes[postcode] + ' ('+ postcode +')';
		$('.information h4').text(infoText);
	}

	feasty.reloadData = function() {
		$('.combined .stores').empty()
		$('.combined .categories').empty()
		feasty.getData(feasty.gmap.foundPostCode);
	}

	feasty.getData = function(postcode) {
		feasty.setProgress(80);
		feasty.partners.menulog.getData(function() {
			feasty.partners.deliveryhero.getData(function() {
				feasty.partners.foodora.getData(function() {
					feasty.setProgress(80);
					feasty.log('got feeds');

					//make the things
					if(config.partners.ml) feasty.partners.menulog.split();
					if(config.partners.dh) feasty.partners.deliveryhero.split();
					
					if(config.partners.fd) feasty.partners.foodora.split();

					feasty.buildLists();

					if(config.partners.fd) feasty.partners.foodora.getFoodoraRatings();

					feasty.sortCategoriesByName();	
					feasty.sortStoresByName();

					feasty.setInfo(postcode);

					feasty.interface();

					feasty.setProgress(100);

				}, postcode);
			}, postcode);
		}, postcode);
	}

	feasty.init = function() {
		feasty.gmap = new feasty.gmap();
		feasty.gmap.init();

		feasty.partners.foodora = new feasty.partners.foodora();
		feasty.partners.menulog = new feasty.partners.menulog();
		feasty.partners.deliveryhero = new feasty.partners.deliveryhero();
	}
}

var feasty = new Feasty();

$(document).ready(function() {
	gui.Window.get().show();
	// gui.Window.get().showDevTools();

	feasty.init();

	$('.boxybox input[name="ml"]')[0].checked = true;
	$('.boxybox input[name="dh"]')[0].checked = true;
	$('.boxybox input[name="fd"]')[0].checked = true;

	$('.postcodeInput').focus();
	$('.postcodeInput').on('keyup', function() {
		feasty.gmap.gmapPlace = false;
	})

	$('.starterconfig button').click(function() {
		if($('.postcodeInput').val() == '' || feasty.gmap.gmapPlace == false) return false;

		config.partners.ml = $('.boxybox input[name="ml"]')[0].checked;
		config.partners.dh = $('.boxybox input[name="dh"]')[0].checked;
		config.partners.fd = $('.boxybox input[name="fd"]')[0].checked;

		$('.starterconfig').hide()
		$('.loading').show();

		feasty.getData(feasty.gmap.foundPostCode);
	});
});