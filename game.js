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
			sleep(500).then(()=>{$(this).remove();});
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
	let res = a.pow(a);
	if (i.gt(1))
		res = res.pow(res.pow(i.sub(1)));
	return res;
}

function square(a, i = new Decimal(1)) {
	let res = a;
	let iter = a;
	while (iter.gt(0)) {
		res = triangle(res);
		iter = iter.sub(1);
	}
	return res;
	if (i.gt(0)&&i.lt(1))
		return triangle(a.pow(i), i);
	if (i.eq(0))
		return a;
	else
		return square(triangle(a, a), i.sub(1));
}

function getMaxTriangleCost(bought, type) {
	let resource;
	switch (type) {
		case 1:
			resource = game.resource;
			break;
		case 2:
			resource = game.squares.value;
			break;
	}
	let amount = new Decimal(0);
	let totalCost = new Decimal(0);
	let cost = new Decimal(0);
	let nextCost = getTriangleCost(bought.add(1), type).log10();
	if (resource.gt('e1e10') && bought.gt(100)) {
		let resource2 = resource.log10(); // 2.96e36
		let diff;
		diff = resource2.div(nextCost);
		if (diff.gt(1e5)) {
			resource2 = Decimal.layeradd(resource2.div(1e5), 1);
			let maxAmount = reverseTriangleCost(resource2, type);
			amount = maxAmount.sub(bought);
		}
	} 
	do {
		cost = getTriangleCost(bought.add(amount.add(1)), type);
		if (resource.gte(cost)) {
			if (typeof(game.halfflip) == 'undefined' || type==2) {
				resource = resource.sub(cost);
				totalCost = totalCost.add(cost);
			} else {
				resource = resource.div(cost);
				totalCost = totalCost.mul(cost);
			}
			amount = amount.add(1);
		}
	} while (resource.gte(cost));
	//}
	resource = Decimal.max(1, resource);
	return [amount, resource];
}

function reverseTriangleCost(resource, type = 1) {
	let scale = 2;
	if (type == 1 && checkUpgrade('flip', 9))
		scale = 2.5;
	let value = resource.log10().log10();
	if (typeof(game.shards) != 'undefined')
		value = value.sub(game.shards.bought.div(5));
	let triangle2 = new Decimal(1);
	if (typeof(game.triangles2) != 'undefined')
		triangle2 = triangle(game.triangles2.value).mul(2);
	value = new Decimal(5).mul(new Decimal(5).sqrt()).mul(triangle2.mul(20).add(value.mul(2).sub(5)).div(triangle2)).sqrt().add(50);
	//value = value.sub(15).mul(scale).add(100);
	if (type == 1 && typeof(game.flip) != 'undefined' && game.flip.flipped.gt(0) && game.achievements[2]) {
		value = value.add(Decimal.log10(game.flip.flipped).floor());
	}
	return value.floor();
}

function getTriangleCost(bought, type = 1) {
	let effectiveBought = bought;
	let cost = new Decimal(0);
	if (type == 1 && typeof(game.flip) != 'undefined' && game.flip.flipped.gt(0) && game.achievements[2]) {
		effectiveBought = effectiveBought.sub(Decimal.log10(game.flip.flipped).floor());
	}
	let shardscale = new Decimal(0.04);
	if (typeof(game.shards) != 'undefined')
		shardscale = shardscale.add(game.shards.bought.div(10));
	shardscale = shardscale.mul(4.7);
	if (effectiveBought<47) {
		cost = Decimal.layeradd(effectiveBought.pow(3).mul(0.00026).add(effectiveBought.pow(2).mul(-0.01)).add(effectiveBought.mul(0.16)), 1).add(effectiveBought.mul(3)).ceil();
		if (type == 1)
			cost = cost.mul(Decimal.layeradd(shardscale, 1));
	} else if (effectiveBought<71) {
		cost = Decimal.layeradd(effectiveBought.sub(43).pow(1.8), 1);
		if (type == 1)
			cost = cost.mul(Decimal.layeradd(shardscale, 1));
	} else if (effectiveBought<101) {
		let scale = new Decimal(10);
		if (type == 1 && checkUpgrade('flip', 9))
			scale = scale.sub(1.75);
		cost = Decimal.layeradd(Decimal.pow(effectiveBought.sub(69), scale), 1);
		if (type == 1)
			cost = cost.add(shardscale);
	} else {
		let scale = 2;
		if (type == 1 && checkUpgrade('flip', 9))
			scale = 2.5;
		cost = effectiveBought.sub(100).div(scale).mul(effectiveBought).div(100);
		if (typeof(game.triangles2) != 'undefined')
			cost = cost.mul(triangle(game.triangles2.value).mul(2));
		cost = cost.add(12.5).add(shardscale);
		if (type == 1)
			cost = Decimal.layeradd(cost, 2);
	}
	
	if (cost.lt(0)) 
		cost = new Decimal(0);
	return cost;
}

function getTriangleBuyAmount() {
	let buyAmount = new Decimal(0.1);
	if (checkUpgrade('flip', 1))
		buyAmount = buyAmount.add(0.05);
	if (typeof(game.shards) != 'undefined') {
		/*if (checkUpgrade('flip', 5))
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
	let cost;
	if (bought.lt(6)) {
		cost = new Decimal(shardCosts[bought-1]);
	} else if (bought.lt(20)) {
		let scale = new Decimal(20);
		if (checkUpgrade('flip', 11))
			scale = scale.sub(2);
		cost = bought.sub(3).mul(bought).mul(scale).div(20).floor().div(20).add(4.8);
	} else {
		let scale = new Decimal(2);
		if (checkUpgrade('flip', 11))
			scale = scale.sub(0.1);
		cost = bought.sub(16).pow(scale);
	}
	if (cost.lt(0)) 
		cost = new Decimal(0);
	if (checkUpgrade('flip', 4))
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
}

function checkUpgrade(type, id) {
	switch (type) {
		case 'flip':
			if (typeof(game.flip) == 'undefined') return false;
			return game.flip.upgrades[id]==true;
			break;
		case 'square':
			if (typeof(game.squares) == 'undefined') return false;
			return game.squares.upgrades[id]==true;
	}
}

function update() {
	// shard
	//let trianglesSpent = new Decimal(0);
	let trianglesValue = new Decimal(1);
	let shardsValue = new Decimal(0);
	
	if (checkUpgrade('flip', 3))  {
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
		if (checkUpgrade('flip', 7))
			shardsValue = shardsValue.add(0.05);
		
		if (checkUpgrade('flip', 6))
			trianglesValue = trianglesValue.add(shards.mul(0.4));
		
		//shardsValue = Decimal.min(1,shardsValue);
		game.shards.value = shardsValue;
		
		//shardsBuyAmount = Decimal.min(shardsBuyAmount, new Decimal(1).sub(shardsValue));
		$('#shards').attr('value', formatValue(game.shards.value, 2));
		$('#shardsBuyAmount').text(format('Buy {0}', formatValue(shardsBuyAmount, 2)));
		$('#shardsCost').text(format('Cost: {0} △', formatValue(getShardCost(shards.add(1)), 2)));
		//$('#shardsButton').text(format('get 0.1 shard for {0} △', flippedAmount));
	}

	// flip
	let flippedAmount = getFlippedAmount();
	$('#flipButton').text(format('Flip △ to get {0} ▽', formatValue(flippedAmount,2)));
	$('#flipButton').prop('disabled', flippedAmount.eq(0));
	
	let trianglesBuyAmount = getTriangleBuyAmount();
	if (typeof(game.flip) == 'undefined') {
		if (game.resource.gte(1e3)) {
			game.flip = {};
			game.flip.flipped = new Decimal(0);
			game.flip.value = new Decimal(0);
			game.flip.upgrades = [];
			game.flip.flipMulti = new Decimal(0);
			$('#flipButton').show();
			$('#flipMult').show();
			notify('Flipping resets all resource and △. Upgrades and achievements will not reset', 30000);
			notify('Get 1e4 resource to flip', 30000);
		}
	} else {
		$('#flippedTriangles').text(format('▽: {0}', formatValue(game.flip.value, 2)));
		$('#flipped').text(format('Times flipped: {0}', formatValue(game.flip.flipped, 2)));
		var flipMultCost = Decimal.pow(40, game.flip.flipMulti).mul(10);
		if (game.achievements[8])
			$('#flippedUpg2Text').html(format('▽ gain multiplier x2.1<br>Cost: {0} ▽', formatValue(flipMultCost,2)));
		else
			$('#flippedUpg2Text').html(format('▽ gain multiplier x2<br>Cost: {0} ▽', formatValue(flipMultCost,2)));
		$('#flipMult').text(format('▽ gain multiplier: {0}', formatValue(getFlipMult(), 2)));
		if (checkUpgrade('flip', 2))
			trianglesValue = trianglesValue.add(1);
		if (checkUpgrade('flip', 10))
			trianglesValue = trianglesValue.add(game.achievements.reduce((a,b)=>a+b,0) * 0.01);
	}
	
	//squares
	if (typeof(game.squares) == 'undefined' && shardsValue.gte(1)) {
		notify('Here we go, finally we can start dealing with squares. Let\'s assemble the first one', 30000);
		game.squares = {};
		game.squares.value = new Decimal(0);
		game.squares.combined = new Decimal(0);
		game.squares.cut = new Decimal(0);
		game.squares.upgrades = [];
		$('#squareButton').show();
		$('#squareButton').attr('data-toggle', 'modal');
	}
	
	if (typeof(game.squares) != 'undefined') {
		let squares = getSquaresAmountToCombine();
		$('#squareButton').html(format('Combine ▫<sup>▫</sup><sub>□</sub> to get {0} ▢', formatValue(squares,2)));
		$('#squareButton').prop('disabled', !squares.gte(1));
		
		$('#combinedSquares').text(format('▢: {0}', formatValue(game.squares.value, 2)));
		$('#cutSquaresCost').text(format('Cost: {0} ▢', formatValue(getCutSquaresCost(game.squares.cut.add(1)), 2)));
		$('#combined').text(format('Times combined: {0}', formatValue(game.squares.combined, 2)));
		
		if (typeof(game.triangles2) == 'undefined') {
			if (checkUpgrade('square', 0)) {
				game.triangles2 = {};
				game.triangles2.value = new Decimal(1);
				game.triangles2.bought = new Decimal(1);
				game.triangles2.income = new Decimal(1);
				$('#triangles2container').show();
			}
		}
	}
	
	let triangles2income = new Decimal(1);
	//triangles2
	if (typeof(game.triangles2) != 'undefined') {
		let triangles2BuyAmount = new Decimal(0.05);
		$('#triangles2BuyAmount').text(format('Buy {0}', formatValue(triangles2BuyAmount, 2)));
		let triangles2value = new Decimal(1);
		game.triangles2.value = triangles2value.add(game.triangles2.bought.mul(triangles2BuyAmount));
		$('#triangles2').attr('value', formatValue(game.triangles2.value, 2));
		triangles2income = triangle(game.triangles2.value);
		game.triangles2.income = triangles2income;
		$('#triangles2Income').text(format('x{0} △ value', formatValue(triangles2income, 2)));
		let cost2 = getTriangleCost(game.triangles2.bought.add(1), 2);
		$('#triangles2Cost').text(format('Cost: {0} ▢', formatValue(cost2, 2)));
	}
	
	game.triangles.value = trianglesValue.add(game.triangles.bought.mul(trianglesBuyAmount)).mul(triangles2income).mul(1000).floor().div(1000);
	$('#triangles').attr('value', formatValue(game.triangles.value, 2));
	$('#trianglesBuyAmount').text(format('Buy {0}', formatValue(trianglesBuyAmount, 2)));
	let triangleIndex = shardsValue.add(1);
	if (typeof(game.squares) != 'undefined')
		triangleIndex = triangleIndex.add(game.squares.cut.mul(0.5));
	let income = triangle(game.triangles.value, triangleIndex);
	if (typeof(game.halfflip) != 'undefined') {
		if (game.halfflip.upgrades[0] == 3 && game.flip.value.gte(10))
			income = income.pow(game.flip.value.log(10).floor());
		if (game.achievements[7])
			income = income.pow(game.triangles.bought);
	}
	if (income.gte(1.78e308) && (typeof(game.halfflip) == 'undefined' || shardsValue.lt(0.5))) {
		income = new Decimal(1.78e308);
		$('#trianglesIncome').text('Infinity per tick');
	} else
		$('#trianglesIncome').text(format('{0} per tick', formatValue(income, 2)));
	game.triangles.income = income;
	
	let resource = game.resource;
	if (resource.gte(1.78e308) && (typeof(game.halfflip) == 'undefined' || shardsValue.lt(0.5))) {
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
	if (cost.gte(1.78e308) && (typeof(game.halfflip) == 'undefined' || shardsValue.lt(0.5))) {
		cost = new Decimal(1.78e308);
		$('#trianglesCost').text('Cost: Infinity');
	} else
		$('#trianglesCost').text(format('Cost: {0}', formatValue(cost, 2)));
	
	//halfflip
	if (typeof(game.halfflip) != 'undefined') {
		if (game.halfflip.upgrades[0] == 1 && flippedAmount.gt(10)) {
			game.flip.value = game.flip.value.add(flippedAmount.div(10).floor());
		}
	}
	
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
	if (!game.achievements[6] && game.resource.gte("1.8e308")) {
		getAchievement(6);
	}
	if (!game.achievements[8] && game.resource.gte("e1e10")) {
		getAchievement(8);
	}
	if (!game.achievements[9] && game.triangles.value.toFixed(2) == '6.90') {
		getAchievement(9);
	}
	if (!game.achievements[10] && getFlipMult().gte(1000)) {
		getAchievement(10);
		$('#flipMultUpgAutobuyContainer').show();
		game.flip.flipMultAuto = true;
	}
	
	if (!game.achievements[13] && typeof(game.squares) != 'undefined' && game.squares.value.gte(11)) {
		getAchievement(13);
	}
	
	if (!game.achievements[14] && triangleIndex.gt(game.triangles.value)) {
		getAchievement(14);
	}
	
	// auto
	if (game.triangles.auto) {
		buyMax('triangles', false);
	}
	if (typeof(game.flip) != 'undefined' && game.flip.flipMultAuto) {
		buyFlipMulti(false);
	}
	if (typeof(game.shards) != 'undefined' && game.shards.auto) {
		buy('shards', false);
	}
}

function talkInfinity() {
	stop = true;
	notify('Can\'t flip a square if you only have half', 30000);
	sleep(3000).then(()=>{
		$('button').each(function(){$(this).prop('disabled',true);});
		notify('What if we try to do half-flip?', 30000);
		var html = $('#root').html(); 
		htmlflip = html.replace(/△/g, '<div class=\'half-flip\'>△</div>');
		htmlflip = htmlflip.replace(/▽/g, '<div class=\'half-flip\'>▽</div>');
		htmlflip = htmlflip.replace(/▫<sup>▫<\/sup><sub>□<\/sub>/g, '<div class=\'half-flip\'>▫<sup>▫</sup><sub>□</sub></div>');
		
		$('#root').html(htmlflip);
		$('.half-flip').each(function(){$(this).toggleClass('rt90');})
		sleep(4500).then(()=>{
			
			//$(".wipe-transition").toggleClass("wipe-trans");
			//$('#root').toggle('explode');
			$('.half-flip').each(function(){$(this).toggle('explode');});
			sleep(1500).then(()=>{
				$('#plus').show();
				$('#plus').toggleClass('rt45');
				$('#root').toggle('explode');
				$('.half-flip').each(function(){$(this).toggleClass('rt90');});
				$('#root').html(html);
				$('.bs-popover-bottom').each(function(){$(this).remove();});
				initPops();
				$('button').each(function(){$(this).prop('disabled',false);});
				halfFlip();
				//$('#root').toggle('explode');
				
			});
			sleep(3000).then(()=>{
				$('#root').toggle('explode');
				sleep(4500).then(()=>{$('#plus').hide();});
				stop = false;
				tick();
				revealInfinity();
				notify('Oopsie! It all went wrong, all our shapes got destroyed! But the addition sign turned into multiplication... Hmm, lets try again...', 30000, true, true);
			});
		});
	});
}

function revealInfinity() {
	$('#flipUpgRow3').show();
	$('#flipUpgRow4').show()
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
		if (game.achievements[8])
			return Decimal.pow(2.1, game.flip.flipMulti);
		else
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
	if (checkUpgrade('flip', 5))
		flipped = flipped.mul(10);
	if (typeof(game.halfflip) != 'undefined') {
		if (game.halfflip.upgrades[0] == 2 && game.flip.value.gte(10))
			flipped = flipped.mul(game.flip.value.log(10).floor().pow(3));
		if (game.halfflip.upg0Reset) {
			hfBuy(0);
			switchHfUpgReset();
		}
		if (!game.achievements[7] && game.triangles.bought.eq(10) && flippedAmount.gte(7.7e7))
			getAchievement(7);
	}
	game.flip.flipped = game.flip.flipped.add(flipped);
	game.flip.value = game.flip.value.add(flippedAmount);
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
	if (game.flip.value.gte(cost)) {
		button.attr('class', 'btn btn-outline-success');
		button.prop('disabled', true);
		game.flip.value = game.flip.value.sub(cost);
		game.flip.upgrades[a] = true;
		update();
	}
}

function buyFlipMulti(doUpdate = true) {
	if (typeof(game.flip.flipMulti) == 'undefined')
		game.flip.flipMulti = new Decimal(0);
	var cost = Decimal.pow(40, game.flip.flipMulti).mul(10);
	if (game.flip.value.gte(cost)) {
		game.flip.flipMulti = game.flip.flipMulti.add(1);
		game.flip.value = game.flip.value.sub(cost);
		if (doUpdate)
			update();
	}
}

function buyAuto(type, doUpdate = true) {
	switch (type) {
		case 'triangles':
			if (game.flip.value.gte(400)) {
				game.flip.value = game.flip.value.sub(400);
				game.triangles.auto = false;
				$('#trianglesAutoUpg').attr('class', 'btn btn-outline-success');
				$('#trianglesAutoUpg').prop('disabled', true);
				$('#trianglesAutobuyContainer').show();
				if (doUpdate)
					update();
			}
			break;
		case 'shards':
			if (game.flip.value.gte(1e40)) {
				game.flip.value = game.flip.value.sub(1e40);
				game.shards.auto = false;
				$('#shardsAutoUpg').attr('class', 'btn btn-outline-success');
				$('#shardsAutoUpg').prop('disabled', true);
				$('#shardsAutobuyContainer').show();
				if (doUpdate)
					update();
			}
	}
}

function switchAutobuy(type) {
	switch (type) {
		case 'triangles':
			game.triangles.auto = !game.triangles.auto;
			$('#trianglesAutobuy').prop('checked', game.triangles.auto);
			break;
		case 'shards':
			game.shards.auto = !game.shards.auto;
			$('#shardsAutobuy').prop('checked', game.shards.auto);
			break;
		case 'flipMulti':
			game.flip.flipMultAuto = !game.flip.flipMultAuto;
			$('#flipMultUpgAutobuy').prop('checked', game.flip.flipMultAuto);
			break;
	}
}

function buy(type) {
	switch (type) {
		case 'triangles':
			var cost = getTriangleCost(game.triangles.bought.add(1));
			if (game.resource.gte(cost)) {
				if (typeof(game.halfflip) != 'undefined') {
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
		case 'trianglesIndex':
			var cost = getCutSquaresCost(game.squares.cut.add(1));
			if (game.squares.value.gte(cost)) {
				game.squares.value = game.squares.value.sub(cost);
				game.squares.cut = game.squares.cut.add(1);
				update();
			}
			break;
		case 'triangles2':
			var cost = getTriangleCost(game.triangles2.bought.add(1), 2);
			if (game.squares.value.gte(cost)) {
				game.squares.value = game.squares.value.sub(cost);
				game.triangles2.bought = game.triangles2.bought.add(1);
				update();
			}
	}
}

function getCutSquaresCost(cut) {
	return cut.pow(cut.div(10).add(1)).floor();
}

function buyMax(type) {
	switch (type) {
		case 'triangles':
			var tryBuyMax = getMaxTriangleCost(game.triangles.bought, 1);
			if (tryBuyMax[0].gt(0)) {
				game.resource = tryBuyMax[1];
				game.triangles.bought = game.triangles.bought.add(tryBuyMax[0]);
				update();
			}
			break;
		case 'triangles2':
			var tryBuyMax = getMaxTriangleCost(game.triangles2.bought, 2);
			if (tryBuyMax[0].gt(0)) {
				game.squares.value = tryBuyMax[1];
				game.triangles2.bought = game.triangles2.bought.add(tryBuyMax[0]);
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
	game.flip.value = new Decimal(0);
	game.flip.upgrades.forEach((a,i)=>game.flip.upgrades[i]=false);
	game.flip.upgrades[3] = true;
	game.halfflip = {};
	game.halfflip.upgrades = [0];
	saveGame(false);
	loadGame(false);
}

function hfBuy(a) {
	if (typeof(game.halfflip) != 'undefined') {
		if (typeof(game.halfflip.upgrades[0]) == 'undefined')
			game.halfflip.upgrades[0] = 0;
		if (a==0) {
			game.halfflip.upgrades[0] = 0;
			for (let i=1; i<=4; i++) {
				$('#HfUpg'+i).attr('class', 'btn btn-outline-primary');
				$('#HfUpg'+i).prop('disabled', false);
			}
		} else {
			if (game.halfflip.upgrades[0] == 0) {
				game.halfflip.upgrades[0] = a;
				for (let i=1; i<=4; i++) {
					if (i != a) {
						$('#HfUpg'+i).attr('class', 'btn btn-outline-secondary');
					} else
						$('#HfUpg'+i).attr('class', 'btn btn-outline-success');
					$('#HfUpg'+i).prop('disabled', true);
				}
			}
		}
	}
}

function switchHfUpgReset() {
	game.halfflip.upg0Reset = !game.halfflip.upg0Reset;
	$('#Hf0ResetCb').prop('checked', game.halfflip.upg0Reset);
}

function revealSquares() {
	$('#combinedSquares').show();
	$('#SquaresTab').show();
	$('#squareButton').attr('onclick', 'combineSquares()');
	$('#flipUpgRow5').show()
	$('#shardsBuyMax').show();
	$('#shardsAutoUpgContainer').show();
}

function getSquaresAmountToCombine() {
	return game.shards.value.floor();
}

function combineSquares() {
	$('#squareButton').attr('data-toggle', '');
	$('#squareButton').attr('onclick','combineSquares()');
	let amount = getSquaresAmountToCombine();
	game.squares.combined = game.squares.combined.add(1);
	if (!game.achievements[11])
		getAchievement(11);
	if (!game.achievements[12] && game.flip.flipped.eq(0)) {
		getAchievement(12);
	}
	game.squares.value = game.squares.value.add(amount);
	
	game.triangles.bought = new Decimal(0);
	if (game.achievements[0])
		game.triangles.bought = new Decimal(10);
	game.triangles.income = new Decimal(1);
	game.shards.bought = new Decimal(0);
	game.resource = new Decimal(1);
	game.flip.flipped = new Decimal(0);
	game.flip.value = new Decimal(0);
	if (!game.achievements[12]) {
		game.flip.upgrades.forEach((a,i)=>game.flip.upgrades[i]=false);
		game.halfflip = {};
		game.halfflip.upgrades = [0];
		game.upg0Reset = true;
	}
	game.flip.upgrades[3] = true;
	game.flip.flipMulti = new Decimal(0);
	update();
	saveGame(false);
	loadGame(false);
}

function sqaureUpgBuy(a) {
	if (typeof(game.squares.upgrades) == 'undefined') {
		game.squares.upgrades = [];
	}
	if (game.squares.upgrades[a]) return;
	var button = $('#squaresUpg'+a);
	var cost = getUpgCost(1,a);
	if (game.squares.value.gte(cost)) {
		button.attr('class', 'btn btn-outline-success');
		button.prop('disabled', true);
		game.squares.value = game.squares.value.sub(cost);
		game.squares.upgrades[a] = true;
		update();
	}
}

var stop = false;
var tickTimeout;
function tick() {
	//console.log('tick');
	if (!stop) {
		if (typeof(game.halfflip) != 'undefined')
			game.resource = game.resource.mul(game.triangles.income);
		else
			game.resource = game.resource.add(game.triangles.income);
		update();
	}
	let tickspeed = 675;
	if (checkUpgrade('flip', 0))
		tickspeed /= 1.5;
	if (game.achievements[3])
		tickspeed /= 1.25;
	if (checkUpgrade('flip', 8))
		tickspeed /= 1.8;
	if (fast) tickspeed /= 3;
	if (tickTimeout != null)
		clearTimeout(tickTimeout);
	tickTimeout = setTimeout(tick, tickspeed);
}

function saveGame(log = true) {
	window.localStorage['MegistonSave'] = JSON.stringify(game);
	if (log) notify('Game saved', 4900, false);
	setTimeout(saveGame, 60000);
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
		
		game.version = 16;
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
			$('#trianglesAutoUpg').prop('disabled', true);
			game.triangles.auto = !game.triangles.auto;
			switchAutobuy('triangles');
		}
		//triangles2
		if (typeof(game.triangles2) != 'undefined') {
			$('#triangles2container').show();
			game.triangles2.value = Decimal.fromString(game.triangles2.value);
			game.triangles2.bought = Decimal.fromString(game.triangles2.bought);
			game.triangles2.income = Decimal.fromString(game.triangles2.income);
		}
		//flip
		if (typeof(game.flip) != 'undefined') {
			$('#flipButton').show();
			$('#FlipTab').show();
			$('#flippedTriangles').show();
			if (game.version < 16) {
				game.flip.value = game.flip.triangles;
				delete game.flip.triangles;
			}
			game.flip.flipped = Decimal.fromString(game.flip.flipped);
			game.flip.value = Decimal.fromString(game.flip.value);
			game.flip.flipMulti = Decimal.fromString(game.flip.flipMulti);
			game.flip.upgrades.forEach((a,i)=>{
				$('#flippedUpg'+i).attr('class', a?'btn btn-outline-success':'btn btn-outline-primary');
				$('#flippedUpg'+i).prop('disabled', a);
			});
			if (typeof(game.flip.flipMultAuto) != 'undefined') {
				$('#flipMultUpgAutobuyContainer').show();
				game.flip.flipMultAuto = !game.flip.flipMultAuto;
				switchAutobuy('flipMulti');
			}
		}
		//shards
		if (checkUpgrade('flip', 3)) {
			revealShards();
			if (typeof(game.shards) != 'undefined') {
				game.shards.value = Decimal.fromString(game.shards.value);
				game.shards.bought = Decimal.fromString(game.shards.bought);
			} else {
				game.shards = {};
				game.shards.value = new Decimal(0);
				game.shards.bought = new Decimal(0);
			}
			if (typeof(game.shards.auto) != 'undefined') {
				$('#shardsAutobuyContainer').show();
				$('#shardsAutoUpg').attr('class', 'btn btn-outline-success');
				$('#shardsAutoUpg').prop('disabled', true);
				game.shards.auto = !game.shards.auto;
				switchAutobuy('shards');
			}
		}
		//halfflip
		if (typeof(game.halfflip) != 'undefined') {
			revealInfinity();
			if (game.version < 15) {
				game.halfflip = {};
				game.halfflip.upgrades = [];
				game.halfflip.upgrades[0] = 0;
			}
			game.halfflip.upg0Reset = !game.halfflip.upg0Reset;
			switchHfUpgReset();
			game.flip.upgrades.forEach((a,i)=>{
				if (game.halfflip.upgrades[0]==0) {
					$('#HfUpg'+(i+1)).attr('class', 'btn btn-outline-primary');
					$('#HfUpg'+(i+1)).prop('disabled', false);
				} else {
					$('#HfUpg'+(i+1)).attr('class', game.halfflip.upgrades[0]==i+1?'btn btn-outline-success':'btn btn-outline-secondary');
					$('#HfUpg'+(i+1)).prop('disabled', true);
				}
			});
		}
		
		//squares
		if (typeof(game.squares) != 'undefined') {
			$('#squareButton').show();
			game.squares.value = Decimal.fromString(game.squares.value);
			game.squares.combined = Decimal.fromString(game.squares.combined);
			game.squares.cut = Decimal.fromString(game.squares.cut);
			revealSquares();
			game.squares.upgrades.forEach((a,i)=>{
				$('#squaresUpg'+i).attr('class', a?'btn btn-outline-success':'btn btn-outline-primary');
				$('#squaresUpg'+i).prop('disabled', a);
			});
		}
		//achs
		game.achievements.forEach((a,i)=>$('#ach'+i).attr('class', a?'btn btn-outline-success':'btn btn-outline-primary'));
		printLog();
		if (log) notify('Game loaded', 4900, false);
		game.version = 16;
		saveGame(false);
		tick();
	}
}

var costs = [[1,5,25,50,100,1000,2000,3000,1e9,1e10,1e12,2e14],[5]];
var shardCosts = [8.5, 8, 6.80, 4.95, 4.9];
var game = {};
var fast = false;
