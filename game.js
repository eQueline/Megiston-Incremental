$(function () {
  $('[data-toggle="popover"]').popover();
  $('[data-toggle="dropdown"]').dropdown();
});

function notify(text, timer=4900) {
	let span = document.createElement('span');
	if (timer > 5000)
		span.setAttribute('class', 'input-group-text input-group-digits');
	else
		span.setAttribute('class', 'input-group-text input-group-digits notify-anim');
	span.innerText = text;
	$('#notify').append(span);
	setTimeout(closeNotification, timer, span);
}

function closeNotification(element) {
	element.outerHTML = '';
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
	if (value.lt(1000)) {
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

function getTriangleCost(bought) {
	let effectiveBought = bought;
	let cost = new Decimal(0);
	if (game.achievements[2]) {
		effectiveBought = effectiveBought.sub(Decimal.log10(game.flip.flipped).floor());
	}
	if (effectiveBought<28) 
		cost = Decimal.pow(1.27, effectiveBought).add(effectiveBought.mul(2.72)).add(6).ceil();
	else if (effectiveBought<40) 
		cost = effectiveBought.sub(27).pow(2.5).mul(1000).ceil();
	else if (effectiveBought<50)
		cost = Decimal.pow(4, effectiveBought.sub(40)).mul(1e6);
	else
		cost = effectiveBought.pow(effectiveBought.sub(41)).pow(2);
	if (cost.lt(0)) 
		cost = new Decimal(0);
	return cost;
}

function getShardCost() {
	let cost = new Decimal(2);
	if (typeof(game.upgrades[0]) != 'undefined' && game.upgrades[0][5])
			cost = cost.sub(0.1);
	if (cost.lt(0)) 
		cost = new Decimal(0);
	return cost;
}

function update() {
	// shard
	let trianglesSpent = new Decimal(0);
	let shardsValue = new Decimal(0);
	if (typeof(game.upgrades[0]) != 'undefined')  {
		if (game.upgrades[0][4]) {
			if (typeof(game.shards)== 'undefined') {
				$('#flipUpgRow2').show();
				$('#shardsContainer').show();
				$('#squareExplain').show();
				notify('Oops! You can not get squares just yet. Try getting some shards first, they are powerful enough on their own, I promise!', 30000);
				$('#ach3ph').hide();
				$('#ach3a').show();
				game.shards = {};
				game.shards.bought = new Decimal(0);
				game.shards.cost = getShardCost();
			}
			let shards = game.shards.bought;
			trianglesSpent = getShardCost().mul(shards);
			let shardsBuyAmount = new Decimal(0.1);
			shardsValue = shards.mul(shardsBuyAmount);
			game.shards.value = shardsValue;
			
			$('#shards').val(formatValue(game.shards.value, 2));
			$('#shardsCost').text(format('Cost: {0} △', formatValue(getShardCost(), 2)));
		}
	}
	
	// flip
	let flippedAmount = getFlippedAmount();
	$('#flipButton').text(format('Flip to get {0} ▽', flippedAmount));
	$('#flipButton').attr('disabled', flippedAmount.eq(0));
	
	let buyAmount = new Decimal(0.1);
	let value = new Decimal(1);
	if (typeof(game.flip) == 'undefined') {
		if (game.resource.gte(5e3))
			$('#flipButton').show();
	} else {
		$('#flippedTriangles').text(format('You have {0} ▽', formatValue(game.flip.triangles)));
		$('#flipped').text(format('Times flipped: {0}', formatValue(game.flip.flipped)));
		if (typeof(game.upgrades[0]) != 'undefined')  {
			if (game.upgrades[0][1])
				buyAmount = buyAmount.add(0.05);
			if (game.upgrades[0][3])
				value = value.add(1);
			$('#trianglesBuyAmount').text(format('+{0}', formatValue(buyAmount, 2)));
		}
	}
	
	game.triangles.value = value.add(game.triangles.bought.mul(buyAmount)).sub(trianglesSpent);
	game.triangles.income = triangle(game.triangles.value, shardsValue.add(1));
	$('#triangles').val(formatValue(game.triangles.value, 2));
	$('#trianglesCost').text('Cost: ' + formatValue(getTriangleCost(game.triangles.bought.add(1)), 2));
	$('#trianglesIncome').text(formatValue(game.triangles.income, 2));
	$('#resource').text('Resource: ' + formatValue(game.resource, 2));
	
	// achievements
	if (!game.achievements[0] && typeof(game.flip) != 'undefined') {
		getAchievement(0);
	}
	if (!game.achievements[1] && game.triangles.value.gte(4.1)) {
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
}

function getFlippedAmount(a) {
	let resource = a?a:game.resource;
	if (resource.lte(0)) return new Decimal(0);
	let amount = Decimal.max(resource.log10().sub(3).floor(), 0);
	if (typeof(game.upgrades[0]) != 'undefined')  {
		if (game.upgrades[0][2])
			amount = amount.mul(2);
	}
	if (amount.gt(0) && game.achievements[1]) 
		amount = amount.add(1);
	return amount;
}

function flip() {
	let flippedAmount = getFlippedAmount();
	if (flippedAmount.lte(0)) return;
	$('#FlipTab').show();
	if (typeof(game.flip) == 'undefined') {
		game.flip = {};
		game.flip.flipped = new Decimal(0);
		game.flip.triangles = new Decimal(0);
	}
	game.flip.flipped = game.flip.flipped.add(1);
	game.flip.triangles = game.flip.triangles.add(flippedAmount);
	update();
	
	game.resource = new Decimal(0);
	game.triangles.value = new Decimal(1);
	game.triangles.bought = new Decimal(0);
	game.triangles.income = new Decimal(1);
	if (game.achievements[0]) {
		game.triangles.bought = new Decimal(10);
	}
	if (typeof(game.shards) != 'undefined') {
		game.shards.bought = new Decimal(0);
	}
	update();
}

function getUpgCost(a,b) {
	return game.costs[a-1][b-1];
}

function flippedBuy(a) {
	if (typeof(game.upgrades[0]) == 'undefined')
		game.upgrades[0] = [];
	if (game.upgrades[0][a-1]) return;
	let button = $('#flippedUpg'+a);
	let cost = getUpgCost(1,a);
	if (game.flip.triangles.gte(cost)) {
		button.attr('class', 'btn btn-outline-success');
		button.attr('disabled', true);
		game.flip.triangles = game.flip.triangles.sub(cost);
		game.upgrades[0][a-1] = true;
		update();
	}
}

function buy(type) {
	switch (type) {
		case 'triangles':
			var cost = getTriangleCost(game.triangles.bought.add(1));
			if (game.resource.gte(cost)) {
				game.resource = game.resource.sub(cost);
				game.triangles.bought = game.triangles.bought.add(1);
			}
			break;
		case 'shards':
			var amount = game.shards.bought.add(1);
			var cost = getShardCost();
			if (game.triangles.value.gt(cost)) {
				if (triangle(game.triangles.value, game.shards.value.add(1)).gt(triangle(game.triangles.value.sub(cost), amount.mul(0.1).add(1)))) {
					notify('That transaction will severely reduce your current income. Get some more △', 15000);
					return;
				}
				game.shards.bought = amount;
			}
			break;
	}
	update();
}

function getAchievement(id){
	game.achievements[id] = true;
	notify('Achievement unlocked: ' + $('#ach'+id).text());
	$('#ach'+id).attr('class', 'btn btn-outline-success');
}

function tick() {
	game.resource = game.resource.add(game.triangles.income);
	update();
	let tickspeed = 675;
	if (typeof(game.upgrades[0]) != 'undefined' && game.upgrades[0])
		tickspeed /= 1.5;
	if (game.achievements[3])
		tickspeed /= 1.25;
	setTimeout(tick, tickspeed);
}

var game = {};
game.resource = new Decimal(0);
game.triangles = {};
game.triangles.value = new Decimal(0);
game.triangles.bought = new Decimal(0);
game.triangles.income = new Decimal(1);

game.squares = {};
game.squares.value = new Decimal(0);
game.squares.cost = new Decimal(1e40);
game.squares.process = square;
game.upgrades = [];
game.costs = [[1,3,10,25,100,500]];
game.achievements = [];
setTimeout(tick, 600);
