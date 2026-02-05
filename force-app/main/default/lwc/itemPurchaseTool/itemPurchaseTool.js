import { LightningElement, api, track, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import getItems from '@salesforce/apex/ItemPurchaseController.getItems';
import getItemCount from '@salesforce/apex/ItemPurchaseController.getItemCount';
import checkoutCart from '@salesforce/apex/ItemPurchaseController.checkoutCart';
import getCurrentUser from '@salesforce/apex/ItemPurchaseController.getCurrentUser';
import ACCOUNT_NAME from '@salesforce/schema/Account.Name';
import ACCOUNT_NUMBER from '@salesforce/schema/Account.AccountNumber';
import ACCOUNT_INDUSTRY from '@salesforce/schema/Account.Industry';

export default class ItemPurchaseTool extends LightningElement {
    @api recordId;
    @track items = [];
    @track cart = [];
    @track searchKey = '';
    @track selectedFamily = '';
    @track selectedType = '';
    @track itemCount = 0;
    @track showItemModal = false;
    @track showCartModal = false;
    @track showCreateItemModal = false;
    @track selectedItem = null;
    @track isManager = false;
    accountName = '';
    accountNumber = '';
    accountIndustry = '';

    @wire(getRecord, { recordId: '$recordId', fields: [ACCOUNT_NAME, ACCOUNT_NUMBER, ACCOUNT_INDUSTRY] })
    account({ data, error }) {
        if (data) {
            this.accountName = data.fields.Name.value;
            this.accountNumber = data.fields.AccountNumber.value;
            this.accountIndustry = data.fields.Industry.value;
        }
    }

    connectedCallback() {
        this.loadItems();
        this.loadItemCount();
        this.loadCurrentUser();
    }

    loadCurrentUser() {
        getCurrentUser()
            .then(result => {
                this.isManager = result.IsManager__c;
            })
            .catch(error => {
                console.error('Error loading user:', error);
            });
    }

    loadItems() {
        getItems({ 
            searchKey: this.searchKey, 
            family: this.selectedFamily, 
            type: this.selectedType 
        })
        .then(result => {
            this.items = result;
        })
        .catch(error => {
            console.error('Error loading items:', error);
        });
    }

    loadItemCount() {
        getItemCount({ 
            family: this.selectedFamily, 
            type: this.selectedType 
        })
        .then(result => {
            this.itemCount = result;
        })
        .catch(error => {
            console.error('Error loading count:', error);
        });
    }

    handleSearch(event) {
        this.searchKey = event.target.value;
        this.loadItems();
    }

    handleFamilyChange(event) {
        this.selectedFamily = event.detail.value;
        this.loadItems();
        this.loadItemCount();
    }

    handleTypeChange(event) {
        this.selectedType = event.detail.value;
        this.loadItems();
        this.loadItemCount();
    }

    handleDetails(event) {
        const itemId = event.target.dataset.id;
        this.selectedItem = this.items.find(item => item.Id === itemId);
        this.showItemModal = true;
    }

    handleAddToCart(event) {
        const itemId = event.target.dataset.id;
        const item = this.items.find(i => i.Id === itemId);
        const existingItem = this.cart.find(i => i.Id === itemId);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({ ...item, quantity: 1 });
        }
        this.cart = [...this.cart];
    }

    handleOpenCart() {
        this.showCartModal = true;
    }

    handleCloseItemModal() {
        this.showItemModal = false;
        this.selectedItem = null;
    }

    handleCloseCartModal() {
        this.showCartModal = false;
    }

    handleCheckout() {
        const cartItems = this.cart.map(item => ({
            itemId: item.Id,
            quantity: item.quantity,
            unitCost: item.Price__c
        }));

        checkoutCart({ 
            accountId: this.recordId, 
            cartItems: JSON.stringify(cartItems) 
        })
        .then(() => {
            this.cart = [];
            this.showCartModal = false;
            window.location.reload();
        })
        .catch(error => {
            console.error('Error during checkout:', error);
        });
    }

    handleCreateItem() {
        this.showCreateItemModal = true;
    }

    handleCloseCreateItemModal() {
        this.showCreateItemModal = false;
    }

    handleItemCreated() {
        this.showCreateItemModal = false;
        this.loadItems();
        this.loadItemCount();
    }

    get familyOptions() {
        return [
            { label: 'All', value: '' },
            { label: 'Family 1', value: 'Family 1' },
            { label: 'Family 2', value: 'Family 2' },
            { label: 'Family 3', value: 'Family 3' },
            { label: 'Family 4', value: 'Family 4' }
        ];
    }

    get typeOptions() {
        return [
            { label: 'All', value: '' },
            { label: 'Type 1', value: 'Type 1' },
            { label: 'Type 2', value: 'Type 2' },
            { label: 'Type 3', value: 'Type 3' },
            { label: 'Type 4', value: 'Type 4' }
        ];
    }

    get cartTotal() {
        return this.cart.reduce((sum, item) => sum + (item.Price__c * item.quantity), 0).toFixed(2);
    }
}