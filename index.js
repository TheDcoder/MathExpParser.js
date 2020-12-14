index_main();

function index_main() {
	var textarea = document.getElementById('code');
	var button = document.getElementById('parse');
	
	button.addEventListener('click', event => {
		try {
			var output = main(['', '', textarea.value || textarea.placeholder]);
			textarea.value = output;
		} catch (e) {
			textarea.value = e;
			console.error(e);
		}
	});
}
