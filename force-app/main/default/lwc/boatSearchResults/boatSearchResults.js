// ...
import { LightningElement , api ,wire} from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import getBoats from '@salesforce/apex/BoatDataService.getBoats';
import updateBoatList from '@salesforce/apex/BoatDataService.updateBoatList';
import BOATMC from '@salesforce/messageChannel/BoatMessageChannel__c';
import { publish,MessageContext} from 'lightning/messageService';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
const SUCCESS_TITLE = 'Success';
const MESSAGE_SHIP_IT     = 'Ship it!';
const SUCCESS_VARIANT     = 'success';
const ERROR_TITLE   = 'Error';
const ERROR_VARIANT = 'error';
export default class BoatSearchResults extends LightningElement {
  selectedBoatId;
  columns = [   { label: 'Name', fieldName: 'Name' ,  type: 'text' , editable: true},
                { label: 'Length', fieldName: 'Length__c', type: 'number', editable: true },
                { label: 'Price', fieldName: 'Price__c', type: 'currency', editable: true },
                { label: 'Description', fieldName: 'Description__c', type: 'text' , editable: true}];
  boatTypeId = '';
  boats;
  isLoading = false;
  
  // wired message context
  @wire (MessageContext)
  messageContext;
  // wired getBoats method 
  @wire (getBoats , {boatTypeId : '$boatTypeId'})
  wiredBoats(result) { 
      if (result.data && !result.error){
          this.boats = result;
          this.error = undefined;
      } else if (result.error){
          this.boats = undefined;
          this.error = result.error;
      }
      this.notifyLoading(false);      
  }
  
  // public function that updates the existing boatTypeId property
  // uses notifyLoading
  @api searchBoats(boatTypeId) {
      this.boatTypeId = boatTypeId ;
      this.notifyLoading(true);
   }
  
  // this public function must refresh the boats asynchronously
  // uses notifyLoading
  @api async refresh() { 
        
      await refreshApex(this.boats).then(() => {
        this.template.querySelector('lightning-datatable').draftValues=[];
        this.notifyLoading(false);
        // Clear all draft values in the datatable
        // add logic for the same
    });
  }
  
  // this function must update selectedBoatId and call sendMessageService
  updateSelectedTile(event) {
      this.selectedBoatId = event.detail.boatId ;
      this.sendMessageService(this.selectedBoatId);
   }
  
  // Publishes the selected boat Id on the BoatMC.
  sendMessageService(boatId) { 
    // explicitly pass boatId to the parameter recordId
    const payload = {recordId: boatId};
    publish(this.messageContext, BOATMC, payload);
  }
  
  // The handleSave method must save the changes in the Boat Editor
  // passing the updated fields from draftValues to the 
  // Apex method updateBoatList(Object data).
  // Show a toast message with the title
  // clear lightning-datatable draft values
  handleSave(event) {
    // notify loading
    this.notifyLoading(true);
    const updatedFields = event.detail.draftValues;
    // Update the records via Apex
    updateBoatList({data: updatedFields})
    .then(() => {
        let toastEvent = new ShowToastEvent({
            "title": SUCCESS_TITLE,
            "variant":SUCCESS_VARIANT,
            "message":MESSAGE_SHIP_IT
        });
        this.dispatchEvent(toastEvent);
        this.refresh();
    })
    .catch(error => {

        let toastEvent = new ShowToastEvent({
            "title": ERROR_TITLE,
            "variant":ERROR_VARIANT,
        });
        this.dispatchEvent(toastEvent);
        this.notifyLoading(false);

    })
    .finally(() => {
    });
  }
  // Check the current value of isLoading before dispatching the doneloading or loading custom event
  notifyLoading(isLoading) {
    this.isLoading = isLoading;
    if (this.isLoading){
        const newLoadingEvent = new CustomEvent('loading');
        this.dispatchEvent(newLoadingEvent);

    }
    else {
        const newDoneLoadingEvent = new CustomEvent('doneloading');
        this.dispatchEvent(newDoneLoadingEvent);
    }
   }
}
