/**
 * Define Global App Variable
 */

if (!window.App) window.App = App = {
    criteria: {
        query: {},
        sort: {},
        page: 1
    },
    timer: {
        search: null
    },
    swipe: {
        oldIndex: 0,
        swipeCount: 0,
        recordsEnd: 1
    }
};


/**
 * Init Servant SDK & App
 */

$(document).ready(function() {

    // Initialize SDK
    Servant.initialize({
        application_client_id: 'LDGZDSdA2tDyUGKD'
    });

    // If access tokens in the current url, save & remove them
    App.access_tokens = Servant.fetchAccessTokens();

    // If app has access tokens start the dashboard view, else intialize the home page view
    if (App.access_tokens) return App._initializeDashboard();
    else return App._initializeHomePage();

});


/**
 * Initialize Home Page
 * - Shown when a user hasn't connected yet
 * - Start home page animations and more here
 */

App._initializeHomePage = function() {
    // Show landing page
    $('#home-page').show();
};

/**
 * Initialize Dashboard
 * - Shown when a user has connected and the app has the user's access tokens
 * - Show a dashboard view that lets the user do something with the data on their servants
 * - This simple example shows one of their products on each servant
 */

App._initializeDashboard = function() {

    // Show showcase page
    $('#showcase-page').show();

    //Initialize bigSlide
    $('.menu-link').bigSlide();

    // Load user & their servants
    Servant.getUserAndServants(App.access_tokens.access_token, function(error, response) {

        // If error, stop everything and log it
        if (error) return console.log(error);

        // If user has no servants in their Servant account, stop everything and alert them.
        if (!response.servants.length) return alert('You must have at least one servant with data on it to use this application');

        // Save data to global app variable
        App.user = response.user;
        App.servants = response.servants;

        console.log("user", App.user);
        console.log("servants", App.servants);

        // Populate the Servant Select field with each Servant
        for (i = 0; i < App.servants.length; i++) {
            $('#table-content tbody').append('<tr class="servant-row"><td class="servant-image"><img class="servant-link search-image" data-servantID="' + App.servants[i]._id + '" src="' + App.servants[i].servant_image + '"></td><td class="master-name"><p class="servant-link" data-servantID="' + App.servants[i]._id + '">' + App.servants[i].master + '</p></td></tr>');
        };

        $('.servant-link').click(function(event) {
            App.criteria.query = {};
            return App._initializeServant($(event.currentTarget).attr('data-servantID')); 
        });

        //Menu Option Expansion
        $('#servants').click(function() {
            $menuButton = $(this);
            $content = $menuButton.next();

            $content.slideToggle(500, function() {

                $('#servant-down').find('i').toggleClass('fa-chevron-circle-down fa-chevron-circle-up');
               
            });
        });

        //Listen for key-up event in search field
        $('#search-box').keyup(function(event) {
            if($('#search-box').val() === "") return false;

            if (App.timer.search !== null) clearTimeout(App.timer.search);

            App.timer.search = setTimeout(function() {
                App._search($('#search-box').val())
            }, 700);

        });

        //Clear search
        $('#clear-search').click(function() {
            $('#search-box').val("");
            App.criteria.query = {};
            App.criteria.page = 1;
            App.slider.slick('slickRemove', null, null, true);
            App._loadProducts(function() {
                for (i = 0; i < App.products.length; i++) {
                    App._renderProduct(App.products[i]);
                }
            });
        });

        // Init Slick.js
        App.slider = $('#products-container');
        App.slider.slick({
            nextArrow: $('#next-product'),
            prevArrow: $('#prev-product')
        });

        App.innerSlider = $('.variation-container');
        App.innerSlider.slick({
            dots: true,
            fade: true
        });

        //Monitor swipe position and add products
        App.slider.on('afterChange', function(event, slick, currentSlide) {
            App._extendProducts(slick, currentSlide);
        });

        // Pick first Servant as default and initialize
        return App._initializeServant(App.servants[0]._id);
    });
};

/**
 * Initialize Servant
 * - Changes the default servant in the app
 * - Clears the view
 * - Reloads products from the new servant and renders one
 */

App._initializeServant = function(servantID) {

    // Find servant with this ID and set it as the App's default servant
    for (i = 0; i < App.servants.length; i++) {
        if (App.servants[i]._id === servantID) App.servant = App.servants[i];
    }

    // Clear products from screen, we're going to reload them from the new servant...
    App.slider.slick('slickRemove', null, null, true);

    // Set query criteria page back to 1
    App.criteria.page = 1;

    // Reload products
    App._loadProducts(function() {

        // Do something depending on whether the new servant holds any product records
        if (!App.products.length) {
            $('#greeting').text('Whoops, you have no products on this Servant.  Go make some in the Servant dashboard!');
        } else {
            $('#greeting').text('Here is a simple example of showing a product on this servant...');

            // Render multiple products
            for (i = 0; i < App.products.length; i++) {
                App._renderProduct(App.products[i]);
            }

        }
    });
};

/**
 * Load Products
 * - Loads Products from the App's default Servant
 * - Uses the App's default criteria settings
 * - Can easily be hooked up to a scroll listener to make infinite scrolling
 */

App._loadProducts = function(callback) {

    // Fetch products
    Servant.queryArchetypes(App.access_tokens.access_token, App.servant._id, 'product', App.criteria, function(error, response) {

        // If error, stop everything and log it
        if (error) return console.log(error);

        // Save data to global app variable
        App.products = response.records;
        App.totalProducts = response.meta.count;
        console.log("Products Loaded: ", response);
        // Increment page number in our query criteria.  Next time we call the function, the next page will be fetched.
        App.criteria.page++;

        // Callback
        if (callback) return callback();

    });
};

/**
 * Render Contact
 * - Renders some html showing a single contact
 */

App._renderProduct = function(product) {

    // Create a string of the contact's html
    var html = '<div class="product">';
    if (product.images.length) html = html + '<img class="image" src="' + product.images[0].resolution_medium + '">';
    html = html + '<p class="name">' + product.name + '</p>';
    html = html + '<p class="price">$' + product.price / 100 + '</p>';
    html = html + '</div>';

    // Append to products inside of slider
    App.slider.slick('slickAdd', html);

};

/**
 * Add More Products
 * - Determines distance from end of carousel and adds more products
 */

App._extendProducts = function(slick, currentSlide) {

    var detectThreshold = slick.slideCount - slick.currentSlide;
    var slideDirection = slick.currentSlide - App.swipe.oldIndex;
    var numPages = Math.ceil(App.totalProducts / 10);

    //Determine swipe direction and record position relative to origin
    if (slideDirection > 0) App.swipe.swipeCount++;
    else if (slideDirection < 0) App.swipe.swipeCount--;

    //Reset position relative to origin if origin is visited
    if (slick.currentSlide === 0) App.swipe.swipeCount = 0;

    //Stop additional product requests when page limit exceeded
    if (App.criteria.page > numPages) return false;
 
    //Render next page of products if criteria met
    if (detectThreshold === 3 && slideDirection > 0 && App.swipe.swipeCount === slick.slideCount - 3) App._loadProducts(function() {

        App.swipe.oldIndex = slick.currentSlide;

        for (i = 0; i < App.products.length; i++) {
            App._renderProduct(App.products[i]);
        }

    });

    else App.swipe.oldIndex = slick.currentSlide;
};

/**
 * Search for Products
 * - Fetches and displays search results
 * - Clears previous search results if they exist
 */

App._search = function(searchParam) {

    if (searchParam == "") App.criteria.query = {};
    else App.criteria = {
        query: {
            $text: {
                $search: searchParam
            }
        },
        page: 1
    };
    //Remove existing search results
    if ($('.search-row').length) $('.search-row').remove();
    // Populate Search Results Table
    App._loadProducts(function() {
        for (i = 0; i < App.products.length; i++) {
            $('#showcase-search-results tbody').append('<tr class="search-row"><td class="result-data"><img class="product-link search-image" data-productID="' + App.products[i]._id + '" src="' + App.products[i].images[0].resolution_thumbnail + '"></td><td class="result-data"><p class="product-link" data-productID="' + App.products[i]._id + '">' + App.products[i].name + '</p></td></tr>');
        }
        $('#showcase-search-results').fadeIn('slow');
        //Listen for search result selection
        $('.product-link').click(function(event) {
            App._selectProduct($(event.currentTarget).attr('data-productID')); 
        });
    });
};

/**
 * Select Products
 * - Clears previous results from slider and displays selected product
 */

App._selectProduct = function(productID) {
    
    App.slider.slick('slickRemove', null, null, true);
    
    for (i = 0; i < App.products.length; i++) {
        
        if (productID === App.products[i]._id) App._renderProduct(App.products[i]);
    }
};

// End

/*$( "#target" ).keyup(function() {
 
         // Show searching text to let user know searching is happening automatically when they type

         if (search_timer) clearTimeout(search_timer);

         var search_timer = setTimeout(function() {
                // Execute search in here
               }, 500);


       });*/


/*$('#search-box').keydown(function(event) {

    if (event.keyCode === 13) App._search($('#search-box').val());
    
    if (App.timer.search !== null) clearTimeout(App.timer.search);

            App.timer.search = setTimeout(function() {
                App._search($('#search-box').val())
            }, 700);

        });*/