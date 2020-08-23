function initPops() {
  $('[data-toggle="popover"]').popover();
  $('[data-toggle="dropdown"]').dropdown();
}

function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

function pushLog(text) {
	game.log.push(text);
	if (game.log.length>10)
		game.log.shift();
	printLog();
}

function printLog() {
	$('#Logs').html('');
	for (let i=game.log.length-1; i>=0; i--) {
		$('#Logs').append('<span>'+game.log[i]+'</span><br>');
	}
}

var notifycounter = 0;
function notify(text, timer=4900, log=true, clear=false) {
	let span = document.createElement('span');
	if (timer > 5000)
		span.setAttribute('class', 'input-group-text input-group-digits');
	else
		span.setAttribute('class', 'input-group-text input-group-digits notify-anim');
	span.setAttribute('id', 'notif' + notifycounter);
	span.setAttribute('onclick', 'closeNotification("notif'+notifycounter+'"); return false;');
	span.innerHTML = text;
	if (log)
		pushLog(text);
	if (clear)
		$('#notify').children().each(function(){
			$(this).toggleClass('notify-anim');
			sleep(5000).then(()=>{$(this).remove();});
		});
	$('#notify').append(span);
	setTimeout(closeNotification, timer, 'notif'+notifycounter);
	notifycounter++;
}

function closeNotification(elementId) {
	var element = document.getElementById(elementId);
	if (element != null)
		element.parentNode.removeChild(element);
}

function format() {
	var args = arguments;
	if (args.length <= 1) { 
		return args;
	}
	var result = args[0];
	for (var i = 1; i < args.length; i++) {
		result = result.replace(new RegExp("\\{" + (i - 1) + "\\}", "g"), args[i]);
	}
	return result;
}

function formatValue(value, prec=0) {
	if (!(value instanceof Decimal)) {
		var value = new Decimal(value);
	}
	if (prec==0) value = value.round();
	if (value.lt(10000)) {
		if (Number.isInteger(value.mag))
			return (value).toFixed(0);
		else 
			return (value).toFixed(prec);
	}
	var mantissa = value.mantissa.toFixed(prec);
	var power = value.e;
		
	if (power > 10000) {
		if (value.layer < 2) {
			return "e" + formatValue(new Decimal(value.e), prec);
		} else {
			return "e" + formatValue(value.log10(), prec);
		}
	}
	return mantissa + "e" + power;
}

function openTab(evt, tabName) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";
}

function triangle(a, i = new Decimal(1)) { 
	if (i.gt(0)&&i.lt(1))
		return a.pow(a.pow(i));
	if (i.eq(0))
		return a; 
	else 
		return triangle(a.pow(a),i.sub(1));
}

function square(a, i = new Decimal(1)) {
	if (i.gt(0)&&i.lt(1))
		return triangle(a.pow(i), i);
	if (i.eq(0))
		return a;
	else
		return square(triangle(a, a), i.sub(1));
}

/*function getMaxTriangleCost() {
	let bought = game.triangles.bought;
	let resource = game.resource;
	let amount = new Decimal(0);
	if (bought.gte(70)) {
		var root = game.resource.log10().sub(52).cbrt().add(62.9).floor();
		if (typeof(game.flip) != 'undefined' && game.flip.flipped.gt(0) && game.achievements[2]) {
			root = root.add(Decimal.log10(game.flip.flipped).floor());
		}
		var cost = getTriangleCost(root);
		if (game.resourse.gt(cost)) {
			resource = 
		}
	} else {
		let totalCost = new Decimal(0);
		
		let cost = new Decimal(0);
		do {
			cost = getTriangleCost(bought.add(amount.add(1)));
			if (resource.gte(cost)) {
				resource = resource.sub(cost);
				totalCost = totalCost.add(cost);
				amount = amount.add(1);
			}
		} while (resource.gte(cost));
		resource = Decimal.max(1, resource);
	}
	return [amount, resource];
}*/
function getMaxTriangleCost() {
	let bought = game.triangles.bought;
	let resource = game.resource;
	let amount = new Decimal(0);
	let totalCost = new Decimal(0);
	let cost = new Decimal(0);
	if (game.halfflip) {
		resource = resource.log10();
		do {
			cost = getTriangleCost(bought.add(amount.add(1))).log10();
			if (resource.gte(cost)) {
				resource = resource.sub(cost);
				totalCost = totalCost.add(cost);
				amount = amount.add(1);
			}
		} while (resource.gte(cost));
		resource = Decimal.layeradd(resource, 1);
	} else {
		do {
			cost = getTriangleCost(bought.add(amount.add(1)));
			if (resource.gte(cost)) {
				resource = resource.sub(cost);
				totalCost = totalCost.add(cost);
				amount = amount.add(1);
			}
		} while (resource.gte(cost));
	}
	resource = Decimal.max(1, resource);
	return [amount, resource];
}

function getTriangleCost(bought) {
	let effectiveBought = bought;
	let cost = new Decimal(0);
	if (typeof(game.flip) != 'undefined' && game.flip.flipped.gt(0) && game.achievements[2]) {
		effectiveBought = effectiveBought.sub(Decimal.log10(game.flip.flipped).floor());
	}
	if (effectiveBought<50)
		cost = Decimal.pow(10, effectiveBought.pow(3).mul(0.00028).add(effectiveBought.pow(2).mul(-0.01)).add(effectiveBought.mul(0.16))).add(effectiveBought.mul(3)).ceil();
	else if (effectiveBought<70) {
		cost = Decimal.pow(10, effectiveBought.sub(41).pow(1.8).sub(34).ceil());
		if (typeof(game.shards) != 'undefined') {
			cost = cost.add(Decimal.pow(1e5, game.shards.bought));
		}
	} else {
		cost = Decimal.pow(10, Decimal.pow(effectiveBought.sub(69), 10).add(394));
	}
	
	if (cost.lt(0)) 
		cost = new Decimal(0);
	return cost;
}

function getTriangleBuyAmount() {
	let buyAmount = new Decimal(0.1);
	if (checkFlipUpgrade(1))
		buyAmount = buyAmount.add(0.05);
	if (typeof(game.shards) != 'undefined') {
		/*if (checkFlipUpgrade(5))
			buyAmount = buyAmount.sub(game.shards.bought.mul(0.04));
		else*/
			buyAmount = buyAmount.sub(game.shards.bought.mul(4).floor().div(100));
	}
	buyAmount = Decimal.max(0.01, buyAmount);
	if (game.achievements[4])
		buyAmount = buyAmount.add(0.01);
	
	return buyAmount;
}

function getShardCost(bought) {
	let cost = new Decimal(shardCosts[bought-1]);
	if (cost.lt(0)) 
		cost = new Decimal(0);
	if (checkFlipUpgrade(4))
		cost = cost.sub(0.2);
	return cost;
}

function getTotalShardCost() {
	let cost = new Decimal(0);
	for (let i=0; i<game.shards.bought; i++) {
		cost = cost.add(getShardCost(new Decimal(i+1)));
	}
	return cost;
}

function revealShards() {
	$('#flipUpgRow2').show();
	$('#shardsContainer').show();
	$('#squareExplain').show();
	$('#ach3ph').hide();
	$('#ach3a').show();
}

function checkFlipUpgrade(a) {
	if (typeof(game.flip) == 'undefined') return false;
	return game.flip.upgrades[a]==true;
}

function update() {
	// shard
	//let trianglesSpent = new Decimal(0);
	let trianglesValue = new Decimal(1);
	let shardsValue = new Decimal(0);
	
	if (checkFlipUpgrade(3))  {
		if (typeof(game.shards)== 'undefined') {
			revealShards();
			notify('Oops! You can not get squares just yet. Try getting some shards first, they are powerful enough on their own, I promise!', 30000);
			game.shards = {};
			game.shards.bought = new Decimal(0);
			$('#shardsButton').show();
		}
		let shards = game.shards.bought;
		//trianglesSpent = getTotalShardCost();
		let shardsBuyAmount = new Decimal(0.1);
		
		shardsValue = shards.mul(shardsBuyAmount);
		if (checkFlipUpgrade(7))
			shardsValue = shardsValue.add(0.05);
		
		if (checkFlipUpgrade(6))
			trianglesValue = trianglesValue.add(shards.mul(0.4));
		game.shards.value = shardsValue;
		
		$('#shards').attr('value', formatValue(game.shards.value, 2));
		$('#shardsBuyAmount').text(format('Add {0}', formatValue(shardsBuyAmount, 2)));
		$('#shardsCost').text(format('Cost: {0} △', formatValue(getShardCost(shards.add(1)), 2)));
		//$('#shardsButton').text(format('get 0.1 shard for {0} △', flippedAmount));
	}

	// flip
	let flippedAmount = getFlippedAmount();
	$('#flipButton').text(format('Flip △ to get {0} ▽', formatValue(flippedAmount,2)));
	$('#flipButton').attr('disabled', flippedAmount.eq(0));
	
	let buyAmount = getTriangleBuyAmount();
	if (typeof(game.flip) == 'undefined') {
		if (game.resource.gte(1e3)) {
			game.flip = {};
			game.flip.flipped = new Decimal(0);
			game.flip.triangles = new Decimal(0);
			game.flip.upgrades = [];
			game.flip.flipMulti = new Decimal(0);
			$('#flipButton').show();
			$('#flipMult').show();
			notify('Flipping resets all resource and △. Upgrades and achievements will not reset', 30000);
			notify('Get 1e4 resource to flip', 30000);
		}
	} else {
		$('#flippedTriangles').text(format('▽: {0}', formatValue(game.flip.triangles, 2)));
		$('#flipped').text(format('Times flipped: {0}', formatValue(game.flip.flipped, 2)));
		var flipMultCost = Decimal.pow(50, game.flip.flipMulti).mul(10);
		$('#flippedUpg2Text').html(format('Double ▽ gain<br>Cost: {0} ▽', formatValue(flipMultCost,2)));
		$('#flipMult').text(format('▽ gain Mult: {0}', formatValue(getFlipMult(),2)));
		if (checkFlipUpgrade(2))
			trianglesValue = trianglesValue.add(1);
		$('#trianglesBuyAmount').text(format('Add {0}', formatValue(buyAmount, 2)));
	}
	
	game.triangles.value = trianglesValue.add(game.triangles.bought.mul(buyAmount));
	$('#triangles').attr('value', formatValue(game.triangles.value, 2));
	
	let triangleIndex = shardsValue.add(1);
	let income = triangle(game.triangles.value, triangleIndex);
	if (income.gte(1.78e308) && !game.halfflip) {
		income = new Decimal(1.78e308);
		$('#trianglesIncome').text('Infinity per tick');
	} else
		$('#trianglesIncome').text(format('{0} per tick', formatValue(income, 2)));
	game.triangles.income = income;
	
	let resource = game.resource;
	if (resource.gte(1.78e308) && !game.halfflip) {
		resource = new Decimal(1.78e308);
		$('#resource').text('Resource: Infinity');
	} else
		$('#resource').text('Resource: ' + formatValue(game.resource, 2));
	game.resource = resource;
	
	if (triangleIndex.neq(1)) {
		$('#trianglesLabel').html(format('△<sub>{0}</sub>', formatValue(triangleIndex, 2)));
		//$('#shardsEffect').text('Increases △ index, but reduces amount per purchase');
	}
	else {
		$('#trianglesLabel').html('△');
	}
	let cost = getTriangleCost(game.triangles.bought.add(1));
	if (cost.gte(1.78e308) && !game.halfflip) {
		cost = new Decimal(1.78e308);
		$('#trianglesCost').text('Cost: Infinity');
	} else
		$('#trianglesCost').text(format('Cost: {0}', formatValue(cost, 2)));
	
	// achievements
	if (!game.achievements[0] && typeof(game.flip) != 'undefined' && game.flip.flipped.gt(0)) {
		getAchievement(0);
	}
	if (!game.achievements[1] && game.triangles.value.gte(4.3)) {
		getAchievement(1);
	}
	if (!game.achievements[2] && game.resource.gte(1e10)) {
		getAchievement(2);
	}
	if (!game.achievements[3] && typeof(game.shards) != 'undefined' && game.shards.value.gt(0)) {
		getAchievement(3);
	}
	if (!game.achievements[4] && typeof(game.flip) != 'undefined' && game.flip.flipped.gte(111)) {
		getAchievement(4);
	}
	if (resource.eq(1.78e308)) {
		if (shardsValue.lt(0.5)) {
			if (typeof(game.infinitied) == 'undefined') {
				game.infinitied = false;
				notify('Gratz with your first Infinity, if a bit early... Now try purchasing all those shards you\'ve been ignoring lately ;)' , 20000);
			}
		} else {
			if (typeof(game.infinitied) == 'undefined') {
				game.infinitied = true;
				notify('Only half of a square and Infinity already? Told you they\'re powerful!', 20000, true, true);
				sleep(2000).then(()=>{
					notify('Let\'s try something else...', 20000);
					setTimeout(talkInfinity, 3000);
				});
			} else if (!game.infinitied) {
				game.infinitied = true;
				notify('Half a square, and it broke again?', 30000, true, true);
				sleep(2000).then(()=>{
					notify('Let\'s try something else...', 30000);
					setTimeout(talkInfinity, 3000);
				});
			}
		}
	}
	if (!game.achievements[5] && typeof(game.infinitied) != 'undefined' && game.infinitied) {
		getAchievement(5);
	}
	if (!game.achievements[6] && game.halfflip && game.resource.gte("1e1000")) {
		//getAchievement(6);
	}
	
	// auto
	if (game.triangles.auto) {
		buyMax('triangles');
	}
}

function talkInfinity() {
	stop = true;
	notify('Can\'t flip a square if you only have half', 30000);
	sleep(3000).then(()=>{
		notify('What if we try to do half-flip?', 30000);
		var html = $('#root').html(); 
		htmlflip = html.replace(/△/g, '<div class=\'half-flip\'>△</div>');
		htmlflip = htmlflip.replace(/▽/g, '<div class=\'half-flip\'>▽</div>');
		htmlflip = htmlflip.replace(/▫<sup>▫<\/sup><sub>□<\/sub>/g, '<div class=\'half-flip\'>▫<sup>▫</sup><sub>□</sub></div>');
		
		$('#root').html(htmlflip);
		$('.half-flip').each(function(){$(this).toggleClass('rt90');})
		sleep(4500).then(()=>{
			$('#plus').show();
			$('#plus').toggleClass('rt45');
			$(".wipe-transition").toggleClass("wipe-trans");
			sleep(2100).then(()=>{
				$('.half-flip').each(function(){$(this).toggleClass('rt90');});
				$('#root').html(html);
				$('.bs-popover-bottom').each(function(){$(this).remove();});
				initPops();
				halfFlip();
			});
			sleep(5000).then(()=>{
				$('#plus').hide();
				stop = false;
				tick();
				revealInfinity();
				notify('Oopsie! It all went wrong, all our shapes got destroyed! But the addition sign turned into multiplication... Hmm, lets try again...', 30000, true, true);
			});
		});
	});
}

function revealInfinity() {
	$('#ach5ph').hide();
	$('#ach5a').show();
	$('#flipUpgRow3').show();
}

function getFlippedAmount(a) {
	let resource = a?a:game.resource;
	if (resource.lte(0)) return new Decimal(0);
	let amount = Decimal.max(resource.log10().sub(3).floor(), 0);
	if (amount.gt(0) && game.achievements[1]) 
		amount = amount.add(1);
	amount = amount.mul(getFlipMult());
	return amount;
}

function getFlipMult() {
	if (typeof(game.flip) != 'undefined' && game.flip.flipMulti > 0) {
		return Decimal.pow(2, game.flip.flipMulti);
	}
	return new Decimal(1);
}

function flip() {
	let flippedAmount = getFlippedAmount();
	if (flippedAmount.lte(0)) return;
	$('#FlipTab').show();
	$('#flippedTriangles').show();
	let flipped = new Decimal(1);
	if (checkFlipUpgrade(5))
		flipped = flipped.mul(10);
	game.flip.flipped = game.flip.flipped.add(flipped);
	game.flip.triangles = game.flip.triangles.add(flippedAmount);
	update();
	
	game.resource = new Decimal(1);
	game.triangles.bought = new Decimal(0);
	if (game.achievements[0]) {
		game.triangles.bought = new Decimal(10);
	}
	update();
}

function getUpgCost(a,b) {
	return costs[a][b];
}

function flippedBuy(a) {
	if (typeof(game.flip.upgrades) == 'undefined') {
		game.flip.upgrades = [];
	}
	if (game.flip.upgrades[a]) return;
	var button = $('#flippedUpg'+a);
	var cost = getUpgCost(0,a);
	if (game.flip.triangles.gte(cost)) {
		button.attr('class', 'btn btn-outline-success');
		button.attr('disabled', true);
		game.flip.triangles = game.flip.triangles.sub(cost);
		game.flip.upgrades[a] = true;
		update();
	}
}

function buyFlipMulti() {
	if (typeof(game.flip.flipMulti) == 'undefined')
		game.flip.flipMulti = new Decimal(0);
	var cost = Decimal.pow(50, game.flip.flipMulti).mul(10);
	if (game.flip.triangles.gte(cost)) {
		game.flip.flipMulti = game.flip.flipMulti.add(1);
		game.flip.triangles = game.flip.triangles.sub(cost);
		update();
	}
}

function buyAuto(type) {
	switch (type) {
		case 'triangles':
			if (game.flip.triangles.gte(500)) {
				game.flip.triangles = game.flip.triangles.sub(500);
				game.triangles.auto = false;
				$('#trianglesAutoUpg').attr('class', 'btn btn-outline-success');
				$('#trianglesAutoUpg').attr('disabled', true);
				$('#trianglesAutobuyContainer').show();
				update();
			}
			break;
	}
}

function switchAutobuy(type) {
	switch (type) {
		case 'triangles':
			game.triangles.auto = $('#trianglesAutobuy').prop('checked');
	}
}

function buy(type) {
	switch (type) {
		case 'triangles':
			var cost = getTriangleCost(game.triangles.bought.add(1));
			if (game.resource.gte(cost)) {
				if (game.halfflip) {
					game.resource = game.resource.div(cost);
				} else {
					game.resource = game.resource.sub(cost);
				}
				game.triangles.bought = game.triangles.bought.add(1);
				update();
			}
			break;
		case 'shards':
			var amount = game.shards.bought.add(1);
			var cost = getShardCost(amount);
			if (game.triangles.value.gte(cost)) {
				game.shards.bought = amount;
				game.resource = new Decimal(1);
				game.triangles.bought = new Decimal(0);
				if (game.achievements[0]) {
					game.triangles.bought = new Decimal(10);
				}
				update();
			}
			break;
	}
}

function buyMax(type) {
	switch (type) {
		case 'triangles':
			var tryBuyMax = getMaxTriangleCost();
			if (tryBuyMax[0].gt(0)) {
				game.resource = tryBuyMax[1];
				game.triangles.bought = game.triangles.bought.add(tryBuyMax[0]);
				update();
			}
			break;
	}
}

function getAchievement(id){
	game.achievements[id] = true;
	notify('Achievement unlocked: ' + $('#ach'+id).text());
	$('#ach'+id).attr('class', 'btn btn-outline-success');
}

var stop = false;
function tick() {
	//console.log('tick');
	if (game.halfflip)
		game.resource = game.resource.mul(game.triangles.income);
	else
		game.resource = game.resource.add(game.triangles.income);
	update();
	let tickspeed = 675;
	if (checkFlipUpgrade(0))
		tickspeed /= 1.5;
	if (game.achievements[3])
		tickspeed /= 1.25;
	if (fast) tickspeed /= 3;
	if (!stop)
		setTimeout(tick, tickspeed);
}

function saveGame(log = true) {
	window.localStorage['MegistonSave'] = JSON.stringify(game);
	if (log) notify('Game saved', 4900, false);
	//setTimeout(saveGame, 60000);
}

function hardReset() {
	delete window.localStorage['MegistonSave'];
}

function loadGame(log = true) {
	let save = window.localStorage['MegistonSave'];
	if (typeof(save) == 'undefined') {
		game = {};
		game.resource = new Decimal(0);
		game.triangles = {};
		game.triangles.value = new Decimal(0);
		game.triangles.bought = new Decimal(0);
		game.triangles.income = new Decimal(1);
		game.achievements = [];
		game.log = [];
		
		game.version = 14;
		saveGame(true);
		tick();
		//loadGame(false);
	} else {
		game = JSON.parse(save);
		if (game.version < 14) {
			hardReset();
			loadGame();
			return;
		}
		game.resource = Decimal.fromString(game.resource);
		//triangles
		game.triangles.value = Decimal.fromString(game.triangles.value);
		game.triangles.bought = Decimal.fromString(game.triangles.bought);
		game.triangles.income = Decimal.fromString(game.triangles.income);
		if (typeof(game.triangles.auto) != 'undefined') {
			$('#trianglesAutobuyContainer').show();
			$('#trianglesAutoUpg').attr('class', 'btn btn-outline-success');
			$('#trianglesAutoUpg').attr('disabled', true);
			game.triangles.auto = false;
		}
		//flip
		if (typeof(game.flip) != 'undefined') {
			$('#flipButton').show();
			$('#FlipTab').show();
			$('#flippedTriangles').show();
			game.flip.flipped = Decimal.fromString(game.flip.flipped);
			game.flip.triangles = Decimal.fromString(game.flip.triangles);
			game.flip.flipMulti = Decimal.fromString(game.flip.flipMulti);
			game.flip.upgrades.forEach((a,i)=>{
				$('#flippedUpg'+i).attr('class', a?'btn btn-outline-success':'btn btn-outline-primary');
				$('#flippedUpg'+i).attr('disabled', a);
			});
		}
		//shards
		if (checkFlipUpgrade(3)) {
			revealShards();
			if (typeof(game.shards) != 'undefined') {
				game.shards.value = Decimal.fromString(game.shards.value);
				game.shards.bought = Decimal.fromString(game.shards.bought);
			} else {
				game.shards = {};
				game.shards.value = new Decimal(0);
				game.shards.bought = new Decimal(0);
			}
		}
		//halfflip
		if (typeof(game.halfflip) != 'undefined') {
			revealInfinity();
		}
		//achs
		game.achievements.forEach((a,i)=>$('#ach'+i).attr('class', a?'btn btn-outline-success':'btn btn-outline-primary'));
		printLog();
		if (log) notify('Game loaded', 4900, false);
		saveGame(false);
		tick();
	}
}

function halfFlip() {
	if (typeof(game.triangles.auto) != 'undefined')
		game.triangles.auto = false;
	game.triangles.bought = new Decimal(0);
	if (game.achievements[0])
		game.triangles.bought = new Decimal(10);
	game.triangles.income = new Decimal(1);
	game.shards.bought = new Decimal(0);
	game.resource = new Decimal(1);
	game.flip.flipped = new Decimal(0);
	game.flip.triangles = new Decimal(0);
	game.flip.upgrades.forEach((a,i)=>game.flip.upgrades[i]=false);
	game.flip.upgrades[3] = true;
	game.halfflip = true;
	saveGame(false);
	loadGame(false);
}

var costs = [[1,5,25,100,150,2500,3000,4000]];
var shardCosts = [8.55, 7.95, 6.80, 4.95, 4.90, 5.7, 6.7, 10, 100];
var game = {};
var fast = false;