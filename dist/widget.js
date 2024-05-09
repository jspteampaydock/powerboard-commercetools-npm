export default class PowerboardCommercetoolsWidget {
    constructor({selector, type, configuration, userId, paymentButtonSelector, radioGroupName}) {
        this.selector = selector;
        this.type = type;
        this.configuration = configuration;
        this.userId = userId || 0;
        this.paymentButtonSelector = paymentButtonSelector;
        this.radioGroupName = radioGroupName;
        this.wallets = ['apple-pay', 'google-pay', 'afterpay_v2', 'paypal_smart'];
        this.apims = ['zippay', 'afterpay_v1'];
        this.billingInfoFields = [
            'first_name',
            'last_name',
            'email',
            'phone',
            'address_line1',
            'address_line2',
            'address_city',
            'address_state',
            'address_country',
            'address_postcode'
        ]
        this.cartItemsFields = [
            'name',
            'type',
            'quantity',
            'item_uri',
            'image_uri',
            'amount'
        ];
        this.canvasSelector = '#powerboard-widget-container-3ds';
        this.amount = 0;
        this.currency = 'AUD';
        this.preChargeWalletToken = null;
        this.paymentButtonElem = null;
        this.country = null;
        this.widget = null;
        this.canvas = null;
        this.vaultToken = undefined;
        this.paymentSource = undefined;
        this.sleepSetTimeout_ctrl = undefined;
        this.saveCard = false;
        this.spinner = null;
        this.overlay = null;
        this.additionalInfo = undefined;
        this.isValidForm = false;
        this.wasInit = false;
        this.billingInfo = {};
        this.shippingInfo = {};
        this.cartItems = [];
        this.referenceId = null;
        this.paymentId = configuration.paymentId;
        this.accessToken = null;

        if('credentials' === this.configuration.api_credentials.credentials_type){
            this.accessToken = this.configuration.api_credentials.credentials_public_key
        }else{
            this.accessToken = this.configuration.api_credentials.credentials_widget_access_key
        }
    }

    setBillingInfo(data) {
        data = this.objectToSnakeCaseFiled(data);
        this.billingInfoFields.forEach((fieldName) => {
            let notEmptyFiled = data.hasOwnProperty(fieldName) && !!data[fieldName];

            this.billingInfo[fieldName] = notEmptyFiled ? data[fieldName] : null;
        })
    }

    setShippingInfo(data) {
        data = this.objectToSnakeCaseFiled(data);
        this.billingInfoFields.forEach((fieldName) => {
            let notEmptyFiled = data.hasOwnProperty(fieldName) && !!data[fieldName];

            this.shippingInfo[fieldName] = notEmptyFiled ? data[fieldName] : null;
        })
    }

    addCartItem(data) {
        data = this.objectToSnakeCaseFiled(data);
        let dataItem = {};

        this.cartItemsFields.forEach((fieldName) => {
            let notEmptyFiled = data.hasOwnProperty(fieldName) && !!data[fieldName];

            dataItem[fieldName] = notEmptyFiled ? data[fieldName] : null;
        })
        this.cartItems.push(dataItem);
    }

    setCartItems(items) {
        this.cartItems = [];

        items.forEach((item) => {
            this.addCartItem(item)
        })
    }

    stringToSnakeCase(string) {
        if ('string' !== typeof string) {
            string = string.toString();
        }

        return string.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    }

    setRefernce(id) {
        this.referenceId = id;
    }

    objectToSnakeCaseFiled(object) {
        let result = {};
        for (let field in object) {
            result[this.stringToSnakeCase(field)] = object[field];
        }

        return result;
    }
    getMetaData(full = false) {
        const charge = {
            amount: this.amount,
            currency: this.currency,
            email: this.billingInfo.email,
            first_name: this.billingInfo.first_name,
            last_name: this.billingInfo.last_name,
            billing_address: {
                first_name: this.billingInfo.first_name,
                last_name: this.billingInfo.last_name,
                line1: this.billingInfo.address_line1,
                line2: this.billingInfo.address_line2,
                country: this.billingInfo.address_country,
                postcode: this.billingInfo.address_postcode,
                city: this.billingInfo.address_city,
                state: this.billingInfo.address_state
            },
            shipping_address: {
                first_name: this.shippingInfo.first_name ?? this.billingInfo.first_name,
                last_name: this.shippingInfo.last_name ?? this.billingInfo.last_name,
                line1: this.shippingInfo.address_line1 ?? this.billingInfo.address_line1,
                line2: this.shippingInfo.address_line2 ?? this.billingInfo.address_line2,
                country: this.shippingInfo.address_country ?? this.billingInfo.address_country,
                postcode: this.shippingInfo.address_postcode ?? this.billingInfo.address_postcode,
                city: this.shippingInfo.address_city ?? this.billingInfo.address_city,
                state: this.shippingInfo.address_state ?? this.billingInfo.address_state
            },
            items: this.cartItems.map(item => {
                return {
                    name: item.name,
                    amount: item.amount,
                    quantity: item.quantity,
                    reference: item.item_uri,
                    image_uri: item.image_uri
                }
            })
        };

        let meta = {};

        if (full) {
            meta = {
                amount: this.amount,
                currency: this.currency,
                email: this.billingInfo.email,
                first_name: this.billingInfo.first_name,
                last_name: this.billingInfo.last_name,
                address_line: this.billingInfo.address_line,
                address_line2: this.billingInfo.address_line2,
                address_city: this.billingInfo.address_city,
                address_state: this.billingInfo.address_state,
                address_postcode: this.billingInfo.address_postcode,
                address_country: this.billingInfo.address_country,
                phone: this.billingInfo.phone
            }
        }

        meta['charge'] = charge;

        return meta;

    }
    afterpayError() {

    }

    setIsValidForm(isValid) {
        this.isValidForm = isValid;
    }

    getWasInit() {
        return this.wasInit;
    }

    afterpayProcessOrder() {
        const inputSourceId = "payment_source_powerboard-pay-afterpay_v2";
        const widgetContainer = document.querySelector(this.selector);

        let interval = setInterval(() => {
            const inputHidden = document.querySelector('[name="' + inputSourceId + '"]');
            if (inputHidden === null) {
                widgetContainer.insertAdjacentHTML('afterend', '<input type="hidden" name="' + inputSourceId + '">')
            }
            if (this.paymentButtonElem) {
                let insertElement = document.querySelector('[name="' + inputSourceId + '"]')
                clearInterval(interval)
                insertElement.value = JSON.stringify({
                    event: "paymentSuccessful",
                    data: {
                        "id": window.localStorage.getItem('powerboard-charge-id'),
                        "amount": this.amount,
                        "currency": this.currency,
                        "status": "pending"
                    }
                });
                this.paymentButtonElem.click();
            }
        }, 100)
    }

    checkIfAfterpayIsSuccess() {
        const params = Object.fromEntries(new URLSearchParams(location.search));

        let result = params.hasOwnProperty('success') && params.success === 'true';

        if (result) {
            this.setSpinner('body');
            this.afterpayProcessOrder();
        } else {
            this.afterpayError()
        }

        return result;
    }

    checkIfAfterpayAfterRedirect() {
        const params = Object.fromEntries(new URLSearchParams(location.search));

        return params.hasOwnProperty('afterpay') && params.afterpay === 'true';
    }

    setPaymentButtonElem(paymentButtonElem) {
        this.paymentButtonElem = paymentButtonElem;
    }

    setAmount(amount) {
        this.amount = amount;
    }

    setCurrency(currency) {
        this.currency = currency;
    }

    setPaymentSource(paymentSource) {
        this.paymentSource = paymentSource;
    }

    setVaultToken(vaultToken) {
        this.vaultToken = vaultToken;
    }

    setAdditionalInfo(additionalInfo) {
        additionalInfo.address_country = 'AU'; // TODO hardcode
        this.additionalInfo = additionalInfo;
    }

    setSpinner(containerSelector) {
        const container = document.querySelector(containerSelector || this.paymentButtonSelector);
        if (!container) return;
        if (!container.querySelector('.widget-spinner')) {
            this.spinner = document.createElement('div');
            this.spinner.classList.add('widget-spinner');
        }
        if (container.tagName.toLowerCase() === 'body') {
            this.overlay = document.createElement('div');
            this.overlay.classList.add('widget-overlay');
            this.overlay.appendChild(this.spinner);
            container.appendChild(this.overlay);
            return;
        }
        container.classList.add('widget-set-disabled');
        container.appendChild(this.spinner);
    }

    removeSpinner(containerSelector) {
        const container = document.querySelector(containerSelector || this.paymentButtonSelector);
        container.classList.remove('widget-set-disabled');

        if ('#' + container.id === this.paymentButtonSelector) {
            const spinnerElement = container.querySelector('.widget-spinner');
            if (spinnerElement) spinnerElement.remove();
            return
        }
        if (this.spinner && container.contains(this.spinner)) {
            this.spinner.remove();
            this.spinner = null;
            if (this.overlay && container.tagName.toLowerCase() === 'body') {
                this.overlay.remove();
                this.overlay = null;
            }
        }
    }

    displayPaymentMethods(paymentMethod) {
        const methodsContainer = document.querySelector('#powerboard-widget-container');
        if (!methodsContainer) {
            console.error("Container for payment methods not found");
            return;
        }

        const methodContainer = document.createElement('div');
        methodContainer.classList.add('powerboard-widget_payment-method');

        const methodHead = document.createElement('div');
        methodHead.classList.add('powerboard-widget_head');

        const radioButton = document.createElement('input');
        radioButton.type = 'radio';
        radioButton.id = `radio_${paymentMethod.name}`;
        radioButton.name = this.radioGroupName;
        radioButton.value = paymentMethod.name;
        methodHead.appendChild(radioButton);

        const label = document.createElement('label');
        label.setAttribute('for', radioButton.id);

        const paymentButton = document.querySelector(this.paymentButtonSelector);
        const handlePaymentMethodClick = (event) => {
            const clickedElement = event.currentTarget;
            const head = clickedElement.parentElement;
            const body = head.nextElementSibling;

            if (!body || !body.classList.contains('powerboard-widget_body')) return;

            if (this.wallets.includes(paymentMethod.type) && !head.classList.contains('active')) {
                paymentButton.classList.add("hide");
                this.initWalletButtons(this.type);
            } else if (this.apims.includes(paymentMethod.type) && !head.classList.contains('active')) {
                paymentButton.classList.add("hide");
                this.initAPIMSButtons(this.type);
            } else {
                paymentButton.classList.remove("hide");
            }

            if (this.widget && !head.classList.contains('active') && !this.wallets.includes(paymentMethod.type) && !this.apims.includes(paymentMethod.type)) {
                this.setSpinner('#' + paymentMethod.name);
                const widgetContainer = document.querySelector(this.selector);
                const checkboxEl = widgetContainer.querySelector('.widget-powerboard-checkbox');
                if (checkboxEl !== null) checkboxEl.remove();
                this.widget.reload();
                this.widget.on('afterLoad', () => {
                    this.removeSpinner('#' + paymentMethod.name);
                    const widgetSpinner = document.querySelector('.widget-spinner');
                    if (widgetSpinner) this.removeSpinner(this.paymentButtonSelector);
                });
            }

            const prevVisibleBody = methodsContainer.querySelector('.powerboard-widget_body:not(.hide)');
            if (prevVisibleBody && prevVisibleBody !== body) {
                prevVisibleBody.classList.add('hide');
                prevVisibleBody.previousElementSibling.classList.remove('active');
                const spinnerElement = prevVisibleBody.querySelector('.widget-spinner');
                if (spinnerElement) spinnerElement.parentNode.removeChild(spinnerElement);
                const widgetDisable = prevVisibleBody.querySelector('.widget-set-disabled');
                if (widgetDisable) widgetDisable.classList.remove('widget-set-disabled');
            }

            const isHidden = body.classList.contains('hide');
            if (isHidden) {
                body.classList.remove('hide');
                head.classList.add('active');
            }
        };
        label.addEventListener('click', handlePaymentMethodClick);
        methodHead.appendChild(label);
        let title = '';
        let description = '';
        if (this.wallets.includes(this.type)) {
            let methodSlug = ('paypal_smart' === this.type) ? 'paypal' : this.type.replace('-', '_');
            let key = 'payment_methods_wallets_' + methodSlug + '_title';
            let keyDescription = 'payment_methods_wallets_' + methodSlug + '_description';
            title = this.configuration.widget_configuration.payment_methods.wallets[key];
            description = this.configuration.widget_configuration.payment_methods.wallets[keyDescription];
        } else if (this.apims.includes(this.type)) {
            let methodSlug = ('zippay' === this.type) ? 'zip' : this.type.replace('-', '_');
            let key = 'payment_methods_alternative_payment_method_' + methodSlug + '_title';
            let keyDescription = 'payment_methods_alternative_payment_method_' + methodSlug + '_description';
            title = this.configuration.widget_configuration.payment_methods.alternative_payment_methods[key];
            description = this.configuration.widget_configuration.payment_methods.alternative_payment_methods[keyDescription];

        } else {
            title = paymentMethod.title;
            description =  paymentMethod.description;

        }
        if(this.configuration.payment_methods[this.type]) {
            this.configuration.payment_methods[this.type].description = description;
        }
        const methodName = document.createTextNode(title);
        const italicElement = document.createElement('i');
        italicElement.appendChild(methodName);
        label.appendChild(italicElement);

        methodContainer.appendChild(methodHead);

        const methodBody = document.createElement('div');
        methodBody.classList.add('powerboard-widget_body', 'hide');

        const getDescription = this.configuration.payment_methods[this.type]?.description;
        if (getDescription !== undefined && getDescription.trim() !== "") {
            const methodDescriptionWrapper = document.createElement('div');
            methodDescriptionWrapper.classList.add('method-description');
            const methodDescriptionText = document.createTextNode(getDescription);
            methodDescriptionWrapper.appendChild(methodDescriptionText);
            methodBody.appendChild(methodDescriptionWrapper);
        }

        const widgetWrapper = document.createElement('div');
        widgetWrapper.setAttribute('id', paymentMethod.name);
        methodBody.appendChild(widgetWrapper);
        methodContainer.appendChild(methodBody);
        methodsContainer.appendChild(methodContainer);
        this.addRadioButtonChangeHandler();
    }

    addRadioButtonChangeHandler() {
        const paymentMethodRadios = document.querySelectorAll(`input[name="${this.radioGroupName}"]`);
        paymentMethodRadios.forEach(radioButton => {
            radioButton.addEventListener('change', () => {
                const methodsContainer = document.querySelector('#powerboard-widget-container');
                if (!methodsContainer.contains(radioButton) && radioButton.checked === true) {
                    const visiblePowerboardWidget = methodsContainer.querySelector('.powerboard-widget_body:not(.hide)');
                    if (visiblePowerboardWidget) {
                        visiblePowerboardWidget.classList.add('hide');
                        const spinnerElement = visiblePowerboardWidget.querySelector('.widget-spinner');
                        if (spinnerElement) spinnerElement.parentNode.removeChild(spinnerElement);
                        const headActivePowerboardWidget = methodsContainer.querySelector('.powerboard-widget_head.active');
                        if (headActivePowerboardWidget) headActivePowerboardWidget.classList.remove('active');
                        const widgetDisable = methodsContainer.querySelector('.widget-set-disabled');
                        if (widgetDisable) widgetDisable.classList.remove('widget-set-disabled');
                    }
                }
            });
        });
    }

    async createWidget() {
        const widgetContainer = document.querySelector(this.selector);
        const configMethod = this.configuration.payment_methods[this.type].config;
        const configStyle = this.configuration.widget_configuration.widget_style;

        if (this.widget !== null) return;

        if (this.type === 'bank_accounts') {
            const bankAccount = new cba.Configuration('not_configured', 'bank_account');

            bankAccount.setFormFields(['account_routing', 'address_country', 'address_postcode', 'address_state', 'address_city', 'address_line1', 'address_line2', 'email']);

            this.widget = new cba.HtmlMultiWidget(this.selector, this.accessToken, [bankAccount]);

            this.widget.onFinishInsert('input[name="payment_source_bank_accounts_token"]', 'payment_source');

            const inputHidden = document.querySelector('[name="payment_source_bank_accounts_token"]');
            if (inputHidden === null) widgetContainer.insertAdjacentHTML('afterend', '<input type="hidden" name="payment_source_bank_accounts_token">')
        }
        if (this.type === 'card') {
            let isPermanent = configMethod.card_3ds !== 'Disable' && configMethod.card_3ds_flow === 'With OTT'

            let gatewayId = isPermanent ? configMethod.card_gateway_id : 'not_configured';

            this.widget = new cba.HtmlWidget(this.selector, this.accessToken, gatewayId);
            console.log(configMethod);
            const supportedCardIcons = configMethod.card_supported_card_schemes.map(item => item.value.toLowerCase());
            this.widget.setSupportedCardIcons(supportedCardIcons);

            this.widget.setFormFields(['address_country', 'address_postcode', 'address_state', 'address_city', 'address_line1', 'address_line2', 'email']);

            this.widget.onFinishInsert('input[name="payment_source_card_token"]', 'payment_source');

            const containerServerError = document.querySelector('#powerboard-widget-card-server-error');
            if (containerServerError === null) widgetContainer.insertAdjacentHTML('afterend', '<div id="powerboard-widget-card-server-error" class="hide powerboard-server-error"></div>');

            const container3Ds = document.querySelector('#powerboard-widget-container-3ds');
            if (container3Ds === null) widgetContainer.insertAdjacentHTML('afterend', '<div id="powerboard-widget-container-3ds" class="hide"></div>');

            const inputHidden = document.querySelector('[name="payment_source_card_token"]');
            if (inputHidden === null) widgetContainer.insertAdjacentHTML('afterend', '<input type="hidden" name="payment_source_card_token">');
        }

        if (this.type === 'bank_accounts' || this.type === 'card') {
            this.widget.on('afterLoad', () => {
                this.widget.hideElements(['submit_button', 'address_country', 'address_postcode', 'address_state', 'address_city', 'address_line1', 'address_line2', 'email']);
            });

            this.widget.setStyles({
                background_color: configStyle.widget_style_bg_color,
                text_color: configStyle.widget_style_text_color,
                border_color: configStyle.widget_style_border_color,
                error_color: configStyle.widget_style_error_color,
                success_color: configStyle.widget_style_success_color,
                font_size: configStyle.widget_style_font_size,
                font_family: configStyle.widget_style_font_family
            });

            if (configStyle.widget_style_custom_element !== undefined && configStyle.widget_style_custom_element.trim() !== "") {
                let elementCustomStyles;
                let widgetCustomStyles = configStyle.widget_style_custom_element;
                elementCustomStyles = JSON.parse(widgetCustomStyles);

                this.widget.setElementStyle('input', elementCustomStyles?.input);
                this.widget.setElementStyle('label', elementCustomStyles?.label);
                this.widget.setElementStyle('title', elementCustomStyles?.title);
                this.widget.setElementStyle('title_description', elementCustomStyles?.title_description);
            }

            this.widget.interceptSubmitForm(this.selector);
            this.widget.load();
        }
    }


    async initAPIMSButtons(type) {

        const widgetContainer = document.querySelector(this.selector);
        const configMethod = this.configuration.payment_methods[this.type].config;

        if (this.widget !== null) return;
        this.setSpinner(this.selector);
        let data = {};
        let meta = {};
        if (type === 'zippay') {
            const htmlBtnElem = document.querySelector('#powerboardAPMsZipButton');
            if (htmlBtnElem === null) widgetContainer.insertAdjacentHTML('afterBegin', '<div align="center" id="powerboardAPMsZipButton"></button>');
            this.widget = new cba.ZipmoneyCheckoutButton(this.selector, this.accessToken, configMethod.alternative_payment_methods_zippay_gateway_id);
        } else {
            const htmlBtnElem = document.querySelector('#powerboardAPMsAfterpayButton');
            if (htmlBtnElem === null) widgetContainer.insertAdjacentHTML('afterBegin', '<div align="center" id="powerboardAPMsAfterpayButton"></div>');
            this.widget = new cba.AfterpayCheckoutButton(this.selector, '7dbe73201da9bea98fef73e44a73f8cbda42e508', '65a915ffbb599fddd1c46dc4');
        }
        if (this.widget) {
            console.log('work')
            const inputHidden = document.querySelector('[name="payment_source_apm_token"]');
            if (inputHidden === null) widgetContainer.insertAdjacentHTML('afterend', '<input type="hidden" name="payment_source_apm_token">')
            this.widget.onFinishInsert('input[name="payment_source_apm_token"]', 'payment_source_token');
            this.widget.setMeta(this.getMetaData('afterpay_v1' === type));
            this.widget.on('finish', () => {
                if (this.paymentButtonElem) {
                    this.paymentButtonElem.click();
                }
            })
        }
        this.removeSpinner(this.selector);
    }

    async initWalletButtons(type) {
        if (this.widget) {
            return;
        }
        let paymentSourceInput = "payment_source_powerboard-pay-" + type;
        let id = this.selector.replace('#', '');

        let element = document.getElementById(id);
        element.innerHTML = '';
        if (!this.preChargeWalletToken && !this.checkIfAfterpayAfterRedirect() && !this.isValidForm) {
            element.innerHTML = '<div class="error-field">' +
                'Please fill in the required fields of the form to display payment methods.' +
                '</div>'
            return;
        }

        this.wasInit = true;

        const widgetContainer = document.querySelector(this.selector);

        this.setSpinner(this.selector);
        if (!this.preChargeWalletToken && !this.checkIfAfterpayAfterRedirect()) {
            this.preChargeWalletToken = await this.createPreChargeWalletToken();
        } else if (this.checkIfAfterpayIsSuccess()) {
            return;
        }
        let widget = null;

        switch (type) {
            case  'apple-pay':
                widget = new cba.WalletButtons(this.selector, this.preChargeWalletToken, {
                    amount_label: "Total",
                    country: this.billingInfo.address_country,
                    wallets: ["apple"],
                    request_shipping: true,
                    show_billing_address: true,
                    raw_data_initialization: {
                        google: {
                            type: "CARD",
                            parameters: {
                                allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"], // TODO evaluate "CRYPTOGRAM_3DS"
                                allowedCardNetworks: [
                                    "AMEX",
                                    "DISCOVER",
                                    "INTERAC",
                                    "JCB",
                                    "MASTERCARD",
                                    "VISA",
                                ],
                                billingAddressRequired: true,
                                billingAddressParameters: {
                                    format: "FULL",
                                },
                            },
                        },
                    },
                });
                break;
            case  'google-pay':
                widget = new cba.WalletButtons(this.selector, this.preChargeWalletToken, {
                    amount_label: "Total",
                    country: this.billingInfo.address_country,
                    wallets: ["google"],
                    request_shipping: true,
                    show_billing_address: true,
                    raw_data_initialization: {
                        google: {
                            type: "CARD",
                            parameters: {
                                allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"], // TODO evaluate "CRYPTOGRAM_3DS"
                                allowedCardNetworks: [
                                    "AMEX",
                                    "DISCOVER",
                                    "INTERAC",
                                    "JCB",
                                    "MASTERCARD",
                                    "VISA",
                                ],
                                billingAddressRequired: true,
                                billingAddressParameters: {
                                    format: "FULL",
                                },
                            },
                        },
                    },
                });
                break;
            case  'afterpay_v2':
                window.localStorage.setItem('powerboard_afterpay_v2_billing_address', JSON.stringify(this.billingInfo))
                window.localStorage.setItem('powerboard_afterpay_v2_shipping_address', JSON.stringify(this.shippingInfo))
                window.localStorage.setItem('powerboard_afterpay_v2_cart_items', JSON.stringify(this.cartItems))
                widget = new cba.WalletButtons(this.selector, this.preChargeWalletToken, {
                    amount_label: this.amount,
                    country: this.billingInfo.address_country,
                });
                break;
            case  'paypal_smart':
                widget = new cba.WalletButtons(this.selector, this.preChargeWalletToken, {
                    request_shipping: true,
                    pay_later: "Enable" === this.configuration.payment_methods[this.type].config.wallets_paypal_smart_button_pay_later,
                    standalone: false,
                    country: this.billingInfo.address_country,
                });
                break;
            default:
                widget = null;
        }

        if (widget) {
            const envVal = this.configuration.sandbox_mode === 'Yes' ? 'preproduction_cba' : 'production_cba';
            widget.setEnv(envVal);
            widget.onUnavailable(() => console.log("No wallet buttons available"));
            widget.onPaymentError((data) => console.log("The payment was not successful"));
            widget.onPaymentInReview((result) => {
                document.querySelector('[name="' + paymentSourceInput + '"]').value = JSON.stringify(result);
                if (this.paymentButtonElem) {
                    this.paymentButtonElem.click();
                }
            });
            widget.load();

            this.widget = widget;
            const inputHidden = document.querySelector('[name="' + paymentSourceInput + '"]');
            if (inputHidden === null) {
                widgetContainer.insertAdjacentHTML('afterend', '<input type="hidden" name="' + paymentSourceInput + '">')
            }
            
            this.widget.onPaymentSuccessful((result) => {
                document.querySelector('[name="' + paymentSourceInput + '"]').value = JSON.stringify(result);
                if (this.paymentButtonElem) {
                    this.paymentButtonElem.click();
                }
            })

        }
        this.removeSpinner(this.selector);
    }

    async process() {
        const configMethod = this.configuration.payment_methods[this.type].config;
        const checkboxName = this.type === 'card' ? 'saveCard' : 'saveBA';
        const checkbox = document.querySelector(`input[name="${checkboxName}"]`);
        if (checkbox) {
            this.saveCard = checkbox.checked;
        }

        let result = {success: true};

        if (this.type === 'card') {
            if (['In-built 3DS', 'Standalone 3DS'].includes(configMethod.card_3ds)) {
                let charge3dsId;
                if (configMethod.card_3ds === 'In-built 3DS') {
                    charge3dsId = await this.initCardInBuild3Ds(this.saveCard);
                } else {
                    charge3dsId = await this.initCardStandalone3Ds();
                }

                if (charge3dsId === false) {
                    return {
                        type: 'error',
                        errorMessage: 'Please fill card data',
                        success: false
                    }
                }

                if (charge3dsId === 'error') {
                    return {
                        type: 'error',
                        errorMessage: 'Payment has been rejected by powerboard.',
                        success: false
                    }
                }
                result.charge3dsId = charge3dsId;
            }
        }

        return result;
    }


    async createPreChargeWalletToken() {
        let currentMethod = this.configuration.payment_methods[this.type];
        if (!currentMethod) {
            throw Error('Unexpected method.')
        }

        let methodConfigSlug = ('paypal_smart' === this.type) ? 'paypal_smart_button' : this.type.replace('-', '_');

        let billingLine2 = this?.billingInfo?.address_line2 ?? this?.billingInfo?.address_line1;
        let shippingLine2 = this?.shippingInfo?.address_line2 ?? this?.shippingInfo?.address_line1;

        let data = {
            customer: {
                first_name: this.billingInfo?.first_name,
                last_name: this?.billingInfo?.last_name,
                email: this?.billingInfo?.email,
                phone: this?.billingInfo?.phone,
            },
            amount: this.amount,
            reference: this.paymentId,
            currency: this.currency,
            meta: {
                store_name: "Commercetools",
            },
            shipping: {
                address_line1: (this.shippingInfo?.address_line1) ?? this?.billingInfo?.address_line1,
                address_line2: shippingLine2 ?? billingLine2,
                address_city: this?.shippingInfo?.address_city ?? this?.billingInfo?.address_city,
                address_state: this?.shippingInfo?.address_state ?? this?.billingInfo?.address_state,
                address_country: this?.shippingInfo?.address_country ?? this?.billingInfo?.address_country,
                address_postcode: this?.shippingInfo?.address_postcode ?? this?.billingInfo?.address_postcode,
                contact: {
                    first_name: this?.shippingInfo?.first_name ?? this?.billingInfo?.first_name,
                    last_name: this?.shippingInfo?.last_name ?? this?.billingInfo?.last_name,
                    email: this?.shippingInfo?.email ?? this?.billingInfo?.email,
                    phone: this?.shippingInfo?.phone ?? this?.billingInfo?.phone,
                },
            },
            items: this.cartItems ?? []
        };

        let paymentSource = {
            gateway_id: currentMethod.config["wallets_" + methodConfigSlug + '_gateway_id'],
            address_line1: this?.billingInfo?.address_line1,
            address_line2: billingLine2,
            address_city: this?.billingInfo?.address_city,
            address_state: this?.billingInfo?.address_state,
            address_country: this?.billingInfo?.address_country,
            address_postcode: this?.billingInfo?.address_postcode,
        }
        if ('apple-pay' === currentMethod.type) {
            paymentSource['wallet_type'] = 'apple';
        } else if ('afterpay_v2' === currentMethod.type) {
            data['meta']['success_url'] = window.location.href + '?afterpay=true&success=true';
            data['meta']['error_url'] = window.location.href + '?afterpay=true&success=false';
        }

        data['customer']['payment_source'] = paymentSource;

        if (('Enable' === currentMethod.config["wallets_" + methodConfigSlug + '_fraud'])
            && currentMethod.config["wallets_" + methodConfigSlug + '_fraud_service_id']) {
            data['fraud'] = {
                service_id: currentMethod.config["wallets_" + methodConfigSlug + '_fraud_service_id'],
                data: {}
            }
        }

        try {
            let response = await this.fetchWithToken(`${this.configuration.api_commercetools.url}${this.configuration.paymentId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    version: this.configuration.paymentVersion,
                    actions: [{
                        action: "setCustomField",
                        name: "PaymentExtensionRequest",
                        value: JSON.stringify({
                            action: "makePreChargeResponse",
                            request: {
                                data,
                                capture: 'Enable' === currentMethod.config["wallets_" + methodConfigSlug + '_direct_charge']
                            }
                        })
                    }]
                }),
            });


            let responseData = await response.json();
            let paymentVersion = responseData?.version ?? null;
            if(paymentVersion){
                this.configuration.paymentVersion = paymentVersion;
            }
            responseData = JSON.parse(responseData?.custom?.fields?.PaymentExtensionResponse);

            if (responseData.status === "Success" && responseData.token) {
                this.preChargeWalletToken = responseData.token;
                window.localStorage.setItem('powerboard-charge-id', responseData.chargeId)
                return this.preChargeWalletToken;
            } else {
                throw new Error(responseData.message || 'Error');
            }
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    hasVaultToken() {
        return this.vaultToken !== undefined
    }

    async fetchWithToken(url, options) {
        return fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                authorization: `Bearer ${this.configuration.api_commercetools.token}`,
            },
        }).then(
            (response) => {
                return response;
            },
            (error) => {
                return Promise.reject(error);
            }
        );
    }

    async getVaultToken() {
        const configMethod = this.configuration.payment_methods[this.type].config;

        if (this.vaultToken !== undefined) {
            return this.vaultToken;
        }

        if (configMethod.card_3ds === 'In-built 3DS' && configMethod.card_3ds_flow === 'With OTT') {
            return this.paymentSource;
        }

        try {
            let data = {token: this.paymentSource};
            if (['card', 'bank_accounts'].includes(this.type) && !this.saveCard) {
                data.vault_type = 'session'
            }

            data.address_country = this.additionalInfo.address_country ?? '';
            data.address_postcode = this.additionalInfo.address_postcode ?? '';
            data.address_city = this.additionalInfo.address_city ?? '';
            data.address_state = this.additionalInfo.address_state ?? '';
            data.address_line1 = this.additionalInfo.address_line ?? '';
            data.address_line2 = this.additionalInfo.address_line2 ?? (this.additionalInfo.address_line ?? '');

            let response = await this.fetchWithToken(`${this.configuration.api_commercetools.url}${this.configuration.paymentId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    version: this.configuration.paymentVersion,
                    actions: [{
                        action: "setCustomField",
                        name: "getVaultTokenRequest",
                        value: JSON.stringify({
                            data,
                            userId: this.userId,
                            saveCard: this.saveCard,
                            type: this.type
                        })
                    }]
                }),
            });

            let responseData = await response.json();
            let paymentVersion = responseData?.version ?? null;
            if(paymentVersion){
                this.configuration.paymentVersion = paymentVersion;
            }
            console.log(`get vault token RESPONSE: ${JSON.stringify(responseData)}`);
            responseData = responseData?.custom?.fields?.getVaultTokenResponse;
            if (responseData) {
                responseData = JSON.parse(responseData);
            }

            if (responseData.status === "Success" && responseData.token) {
                this.vaultToken = responseData.token;
                return this.vaultToken;
            } else {
                throw new Error(responseData.error || 'Error');
            }
        } catch (error) {
            // this.removeSpinner(this.selector);

            console.error('Error:', error);
            throw error;
        }
    }

    async initCardInBuild3Ds(forcePermanentVault = false) {
        const configMethod = this.configuration.payment_methods[this.type].config;
        let result = false;
        const widgetContainer = document.querySelector(this.selector);
        const canvasContainer = document.querySelector(this.canvasSelector);

        if (this.vaultToken === undefined && (configMethod.card_3ds_flow === 'With vault' || forcePermanentVault)) {
            this.vaultToken = await this.getVaultToken();
        }

        const envVal = this.configuration.sandbox_mode === 'Yes' ? 'preproduction_cba' : 'production_cba';

        const preAuthData = {
            amount: this.amount,
            currency: 'AUD', // this.currency
        };

        if (configMethod.card_3ds_flow === 'With vault' || forcePermanentVault) {
            preAuthData.customer = {
                payment_source: {
                    vault_token: this.vaultToken,
                    gateway_id: configMethod.card_gateway_id
                }
            }
        } else {
            preAuthData.token = this.paymentSource
        }

        const preAuthResp = await new cba.Api(this.accessToken)
            .setEnv(envVal)
            .charge()
            .preAuth(preAuthData);

        if (typeof preAuthResp._3ds.token === "undefined") {
            return false;
        }

        this.canvas = new powerboard.Canvas3ds(this.canvasSelector, preAuthResp._3ds.token);
        this.canvas.load();

        widgetContainer.classList.add('hide');
        canvasContainer.classList.remove('hide');

        this.canvas.on('chargeAuth', (chargeAuthEvent) => {
            result = chargeAuthEvent.charge_3ds_id
        })
        this.canvas.on('additionalDataCollectReject', (chargeAuthSuccessEvent) => {
            result = 'error';
        })
        this.canvas.on('chargeAuthReject', function (data) {
            result = 'error';
        });

        for (let second = 1; second <= 10000; second++) {
            await this.sleep(100);

            if (result !== false) {
                break;
            }
        }

        return result;
    }

    async initCardStandalone3Ds() {
        const widgetContainer = document.querySelector(this.selector);
        const canvasContainer = document.querySelector(this.canvasSelector);

        if (this.vaultToken === undefined) {
            this.vaultToken = await this.getVaultToken();
        }

        const threeDsToken = await this.getStandalone3dsToken();

        this.canvas = new powerboard.Canvas3ds(this.canvasSelector, threeDsToken);
        this.canvas.load();

        widgetContainer.classList.add('hide');
        canvasContainer.classList.remove('hide');

        let result = false;
        this.canvas.on('chargeAuthSuccess', (chargeAuthSuccessEvent) => {
            result = chargeAuthSuccessEvent.charge_3ds_id
        })
        this.canvas.on('additionalDataCollectReject', (chargeAuthSuccessEvent) => {
            result = 'error'
        })
        this.canvas.on('chargeAuthReject', function (data) {
            result = 'error';
        });

        for (let second = 1; second <= 10000; second++) {
            await this.sleep(100);

            if (result !== false) {
                break;
            }
        }

        return result;
    }

    async getStandalone3dsToken() {
        const configMethod = this.configuration.payment_methods[this.type].config;
        try {
            const currentDate = new Date();
            let payment_source = {
                vault_token: this.vaultToken,
                address_state: 'QLD', // TODO hadrcode
            }

            if (configMethod.card_gateway_id) {
                payment_source.gateway_id = configMethod.card_gateway_id;
            }

            const data = {
                amount: this.amount,
                reference: '',
                currency: "AUD",
                customer: {
                    first_name: this.additionalInfo?.billing_first_name ?? '',
                    last_name: this.additionalInfo?.billing_last_name ?? '',
                    email: this.additionalInfo?.billing_email ?? '',
                    payment_source: payment_source
                },
                _3ds: {
                    service_id: configMethod.card_3ds_service_id ?? '',
                    authentication: {
                        type: "01",
                        date: currentDate.toISOString()
                    }
                }
            };

            let response = await this.fetchWithToken(`${this.configuration.api_commercetools.url}${this.configuration.paymentId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    version: this.configuration.paymentVersion,
                    actions: [{
                        action: "setCustomField",
                        name: "getStandalone3dsTokenRequest",
                        value: JSON.stringify(data)
                    }]
                }),
            });

            let responseData = await response.json();
            let paymentVersion = responseData?.version ?? null;
            if(paymentVersion){
                this.configuration.paymentVersion = paymentVersion;
            }
            console.log(`get vault token RESPONSE: ${JSON.stringify(responseData)}`);
            responseData = responseData?.custom?.fields?.getStandalone3dsTokenResponse;
            if (responseData) {
                responseData = JSON.parse(responseData);
            }

            if (responseData.status === "Success" && responseData.token) {
                return responseData.token;
            } else {
                throw new Error(responseData.message || 'Error');
            }
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    sleep(ms) {
        clearInterval(this.sleepSetTimeout_ctrl);
        return new Promise(resolve => this.sleepSetTimeout_ctrl = setTimeout(resolve, ms));
    }

    setAdditionalValue(billingData) {
        this.widget.updateFormValues({
            address_country: billingData?.value?.country ?? 'AU',
            address_postcode: billingData?.value?.postalCode ?? '',
            address_state: billingData?.value?.streetName ?? '',
            address_city: billingData?.value?.city ?? '',
            address_line1: billingData?.value?.additionalStreetInfo ?? '',
            address_line2: billingData?.value?.additionalStreetInfo ?? '',
            email: billingData?.value?.email ?? ''
        });
    }

    renderCredentialsSelect() {
        const widgetContainer = document.querySelector(this.selector);

        const selectEl = widgetContainer.querySelector('.select');
        if (selectEl !== null || !this.configuration.saved_credentials || !this.configuration.saved_credentials[this.type]) return;

        const savedCredentials = this.configuration.saved_credentials[this.type];

        if (Object.keys(savedCredentials).length) {

            const selectWrapper = document.createElement('div');
            selectWrapper.classList.add('widget-powerboard-select');

            let savedPaymentDetailsText = 'Saved payment details';

            if (this.type === 'bank_accounts') selectWrapper.innerHTML = savedPaymentDetailsText;
            if (this.type === 'card') selectWrapper.innerHTML = savedPaymentDetailsText;

            let select = document.createElement('div');
            select.classList.add('select');

            widgetContainer.appendChild(selectWrapper);
            selectWrapper.appendChild(select);

            let value = document.createElement('div');
            value.classList.add('value');
            value.innerText = 'Select...';
            select.appendChild(value);

            const dropdown = document.createElement('div');
            dropdown.classList.add('dropdown');
            select.appendChild(dropdown);

            const optionsWrapper = document.createElement('ul');
            dropdown.appendChild(optionsWrapper);

            const option = document.createElement('li');
            if (this.type === 'card') option.textContent = 'New Card';
            if (this.type === 'bank_accounts') option.textContent = 'New Bank account';
            optionsWrapper.appendChild(option);

            Object.values(savedCredentials).forEach((credential, index) => {
                const option = document.createElement('li');
                option.textContent = credential.title;
                optionsWrapper.appendChild(option);
            });

            optionsWrapper.style.overflowY = optionsWrapper.offsetHeight < 206 ? 'auto' : 'scroll'

            value.addEventListener('click', function () {
                select.classList.toggle('-open')
            })

            document.addEventListener('click', function (e) {
                if (!e.composedPath().includes(select)) {
                    select.classList.remove('-open')
                }
            })

            let timerLeave = null
            select.onmouseenter = () => clearTimeout(timerLeave);
            select.onmouseleave = () => {
                timerLeave = setTimeout(() => {
                    select.classList.remove('-open')
                }, 500)
            }

            // init click on option

            const widget = this.widget;
            const type = this.type;
            value = widgetContainer.querySelector('.value');
            select = widgetContainer.querySelector('.select');
            const options = widgetContainer.querySelectorAll('.select li');

            options.forEach((currentElement) => {
                const clickOptionHandler = () => {
                    value.innerText = currentElement.textContent;
                    select.classList.remove('-open')

                    Object.values(savedCredentials).forEach((credential, index) => {
                        if (type === 'card' && currentElement.textContent === 'New Card') {
                            widgetContainer.classList.remove('selected-saved-card');
                            this.vaultToken = undefined;
                        } else if (type === 'bank_accounts' && currentElement.textContent === 'New Bank account') {
                            widget.updateFormValues({
                                account_number: '',
                                account_name: '',
                                account_routing: '',
                            });
                            widgetContainer.classList.remove('selected-saved-bank');
                            this.vaultToken = undefined;
                        } else {
                            if (credential.title.trim() === currentElement.textContent.trim()) {
                                if (type === 'bank_accounts') {
                                    widget.updateFormValues({
                                        account_number: credential?.data?.account_number ?? '',
                                        account_name: credential?.data?.account_name ?? '',
                                        account_routing: credential?.data?.account_routing ?? '',
                                    });
                                    widgetContainer.classList.add('selected-saved-bank');
                                    this.vaultToken = credential.vault_token;
                                    const inputHidden = document.querySelector('[name="payment_source_bank_accounts_token"]');
                                    inputHidden.value = this.vaultToken;
                                }
                                if (type === 'card') {
                                    widgetContainer.classList.add('selected-saved-card');
                                    this.vaultToken = credential.vault_token;
                                    const inputHidden = document.querySelector('[name="payment_source_card_token"]');
                                    inputHidden.value = this.vaultToken;
                                }
                            }
                        }

                    })
                };
                currentElement.addEventListener('click', clickOptionHandler);
            })
        }
    }

    renderSaveCardCheckbox() {
        const widgetContainer = document.querySelector(this.selector);
        const checkbox = document.createElement('label');
        checkbox.classList.add('widget-powerboard-checkbox');

        const checkboxEl = widgetContainer.querySelector('.widget-powerboard-checkbox');
        if (checkboxEl !== null) return;

        let savePaymentDetailsText = 'Save payment details';

        if (this.type === 'bank_accounts') checkbox.innerHTML = `<input type="checkbox" name="saveBA">&nbsp ${savePaymentDetailsText}`;
        if (this.type === 'card') checkbox.innerHTML = `<input type="checkbox" name="saveCard">&nbsp ${savePaymentDetailsText}`;

        this.widget.on('afterLoad', () => {
            widgetContainer.appendChild(checkbox);
            checkbox.querySelector('input').addEventListener('change', (e) => {
                this.saveCard = e.currentTarget.checked;
            });
        });
    }

    isSaveCardEnable() {
        const configMethod = this.configuration.payment_methods[this.type].config;

        return (this.type === 'bank_accounts' && configMethod.bank_accounts_bank_account_save === 'Enable') ||
            (this.type === 'card' && configMethod.card_card_save === 'Enable');
    }

    async loadWidget() {
        if (['bank_accounts', 'card'].includes(this.type)) this.createWidget();
    }
}

{/*
<div id="widget"></div>
<script src="../powerboard-commercetools-widget.js"></script>

<script>
    const PowerboardCommercetoolsWidget = new PowerboardCommercetoolsWidget('#widget', 'bank_accounts', 'userId'); // (selector, type, userId)
    powerboardCommercetooslWidget.loadWidget();
</script>
*/
}
