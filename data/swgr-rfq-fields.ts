import { RFQFieldData, PageType } from '@/types/swgr-rfq'

export const RFQ_COMPLETE_FIELDS: Omit<RFQFieldData, 'hierarchicalId' | 'originalIndex' | 'currentIndex'>[] = [
  // Page 1: Basic Information
  { id: 'cover_1', pageName: '1.0 Basic Information', categoryName: '1.1 Base Info.', fieldName: 'Your RFQ No.', fieldType: 'text', required: true, placeholder: 'e.g., Q-2024-123' },
  { id: 'cover_2', pageName: '1.0 Basic Information', categoryName: '1.1 Base Info.', fieldName: 'Revision No.', fieldType: 'dropdown', dropdownOptions: '-,A,B,C,D,E,F,G,H' },
  { id: 'cover_3', pageName: '1.0 Basic Information', categoryName: '1.1 Base Info.', fieldName: 'Date', fieldType: 'date', required: true },
  
  { id: 'cover_4', pageName: '1.0 Basic Information', categoryName: '1.2 Contact Info.', fieldName: 'Sent To', fieldType: 'text', currentValue: 'Fuji Electric Manufacturing(Thailand) Co.Ltd' },
  { id: 'cover_5', pageName: '1.0 Basic Information', categoryName: '1.2 Contact Info.', fieldName: 'Attn (Contact 1)', fieldType: 'text', placeholder: 'Name' },
  { id: 'cover_6', pageName: '1.0 Basic Information', categoryName: '1.2 Contact Info.', fieldName: 'Attn Email (Contact 1)', fieldType: 'email', placeholder: 'Email' },
  { id: 'cover_7', pageName: '1.0 Basic Information', categoryName: '1.2 Contact Info.', fieldName: 'Attn (Contact 2)', fieldType: 'text', placeholder: 'Name' },
  { id: 'cover_8', pageName: '1.0 Basic Information', categoryName: '1.2 Contact Info.', fieldName: 'Attn Email (Contact 2)', fieldType: 'email', placeholder: 'Email' },
  { id: 'cover_9', pageName: '1.0 Basic Information', categoryName: '1.2 Contact Info.', fieldName: 'Attn (Contact 3)', fieldType: 'text', placeholder: 'Name' },
  { id: 'cover_10', pageName: '1.0 Basic Information', categoryName: '1.2 Contact Info.', fieldName: 'Attn Email (Contact 3)', fieldType: 'email', placeholder: 'Email' },
  { id: 'cover_11', pageName: '1.0 Basic Information', categoryName: '1.2 Contact Info.', fieldName: 'CC', fieldType: 'email', placeholder: 'cc@example.com' },
  { id: 'cover_16', pageName: '1.0 Basic Information', categoryName: '1.2 Contact Info.', fieldName: 'PIC Name of OSC sales', fieldType: 'text' },
  { id: 'cover_17', pageName: '1.0 Basic Information', categoryName: '1.2 Contact Info.', fieldName: 'PIC Name of OSC engineering', fieldType: 'text' },
  { id: 'cover_18', pageName: '1.0 Basic Information', categoryName: '1.2 Contact Info.', fieldName: 'PIC Name (FET)', fieldType: 'text' },
  { id: 'cover_19', pageName: '1.0 Basic Information', categoryName: '1.2 Contact Info.', fieldName: 'Section', fieldType: 'text' },
  { id: 'cover_20', pageName: '1.0 Basic Information', categoryName: '1.2 Contact Info.', fieldName: 'Mail', fieldType: 'email' },
  { id: 'cover_21', pageName: '1.0 Basic Information', categoryName: '1.2 Contact Info.', fieldName: 'TEL', fieldType: 'text' },

  { id: 'cover_12', pageName: '1.0 Basic Information', categoryName: '1.3 Project Info.', fieldName: 'Project Name', fieldType: 'text', required: true, placeholder: 'Full project name' },
  { id: 'cover_13', pageName: '1.0 Basic Information', categoryName: '1.3 Project Info.', fieldName: 'Project address', fieldType: 'multiline', placeholder: 'Full project address' },
  { id: 'cover_22', pageName: '1.0 Basic Information', categoryName: '1.3 Project Info.', fieldName: 'SBU Code', fieldType: 'text' },
  { id: 'cover_29', pageName: '1.0 Basic Information', categoryName: '1.3 Project Info.', fieldName: 'Industrial Category (for End Customer)', fieldType: 'dropdown', dropdownOptions: 'Mining,Chemicals,Oil and Gas,Foods,Iron and Steel,Nonferrous Metals,Transportation Equipment,Other Products (Manufacturer),Electric Power and Gas,IPP and Renewable Energy,Water Treatment,Transportation,Commercial and Residential,Others', required: true },
  { id: 'cover_30', pageName: '1.0 Basic Information', categoryName: '1.3 Project Info.', fieldName: 'SBU (E)', fieldType: 'dropdown', dropdownOptions: '15. Electric Substation,41. Industrial Substation,07. Facility Electrical Machinery,44. Railroads\' Substation,40. Industrial Power Source,46. Solar Power Systems,11. Drive Control Systems' },
  { id: 'cover_34', pageName: '1.0 Basic Information', categoryName: '1.3 Project Info.', fieldName: 'Features of the project', fieldType: 'dropdown', dropdownOptions: 'New construction,Renewal,Expansion,Modification' },
  { id: 'cover_35', pageName: '1.0 Basic Information', categoryName: '1.3 Project Info.', fieldName: 'Project Status of Activities', fieldType: 'dropdown', dropdownOptions: 'Feasibility study Conception & Initiation by End User,Definition & Planning by consultant,Customer RFQ and specification completed,Launch or Execution' },
  { id: 'cover_36', pageName: '1.0 Basic Information', categoryName: '1.3 Project Info.', fieldName: 'RFP (Request For Proposal)', fieldType: 'dropdown', dropdownOptions: 'Open Tendering,Selective (close) Tendering,Negotiated Tendering,Others(will be explained)' },

  { id: 'cover_14', pageName: '1.0 Basic Information', categoryName: '1.4 Customer Info.', fieldName: 'End Customer Name', fieldType: 'text', required: true },
  { id: 'cover_15', pageName: '1.0 Basic Information', categoryName: '1.4 Customer Info.', fieldName: 'End Customer Location', fieldType: 'text' },
  { id: 'cover_23', pageName: '1.0 Basic Information', categoryName: '1.4 Customer Info.', fieldName: 'OSC\'s Client Name', fieldType: 'text' },
  { id: 'cover_24', pageName: '1.0 Basic Information', categoryName: '1.4 Customer Info.', fieldName: 'OSC\'s Client Location', fieldType: 'text' },
  { id: 'cover_25', pageName: '1.0 Basic Information', categoryName: '1.4 Customer Info.', fieldName: 'Client was awarded', fieldType: 'dropdown', dropdownOptions: 'Yes,No,informed later' },
  { id: 'cover_26', pageName: '1.0 Basic Information', categoryName: '1.4 Customer Info.', fieldName: 'EPC Contractor Name (if any)', fieldType: 'text' },
  { id: 'cover_27', pageName: '1.0 Basic Information', categoryName: '1.4 Customer Info.', fieldName: 'M&E Contractor Name (if any)', fieldType: 'text' },
  { id: 'cover_28', pageName: '1.0 Basic Information', categoryName: '1.4 Customer Info.', fieldName: 'Consultant Name (if any)', fieldType: 'text' },

  { id: 'cover_31', pageName: '1.0 Basic Information', categoryName: '1.5 Scope & Requirements', fieldName: 'Quote', fieldType: 'dropdown', dropdownOptions: 'Firm,Budgetary' },
  { id: 'cover_32', pageName: '1.0 Basic Information', categoryName: '1.5 Scope & Requirements', fieldName: 'Order Probability', fieldType: 'dropdown', dropdownOptions: 'S - 100%,A - 80%,B - 50%,C - 30%' },
  { id: 'cover_33', pageName: '1.0 Basic Information', categoryName: '1.5 Scope & Requirements', fieldName: 'OSC\'s scope of work', fieldType: 'dropdown', dropdownOptions: 'EPC Position,M&E Position (Site inst cable work included),Electrical Package (Eng+Product+Site Testing),Eng+Product supply,Site testing +Product supply,Product supply only' },
  { id: 'sheet_a_1', pageName: '1.0 Basic Information', categoryName: '1.5 Scope & Requirements', fieldName: '2-Year Spare Part', fieldType: 'dropdown', dropdownOptions: 'Yes,No' },
  { id: 'sheet_a_2', pageName: '1.0 Basic Information', categoryName: '1.5 Scope & Requirements', fieldName: 'Commissioning Spare', fieldType: 'dropdown', dropdownOptions: 'Yes,No' },
  { id: 'sheet_a_3', pageName: '1.0 Basic Information', categoryName: '1.5 Scope & Requirements', fieldName: 'Special Tool', fieldType: 'dropdown', dropdownOptions: 'Yes,No' },
  { id: 'sheet_a_4', pageName: '1.0 Basic Information', categoryName: '1.5 Scope & Requirements', fieldName: 'FAT（Factory Acceptance Test）', fieldType: 'dropdown', dropdownOptions: 'Yes,No' },

  { id: 'cover_37', pageName: '1.0 Basic Information', categoryName: '1.6 Delivery & Logistics', fieldName: 'Currency', fieldType: 'dropdown', dropdownOptions: 'USD,THB,EUR,JPY' },
  { id: 'cover_38', pageName: '1.0 Basic Information', categoryName: '1.6 Delivery & Logistics', fieldName: 'Quotation Validity', fieldType: 'number', placeholder: 'days' },
  { id: 'cover_39', pageName: '1.0 Basic Information', categoryName: '1.6 Delivery & Logistics', fieldName: 'Transport/Shipping', fieldType: 'dropdown', dropdownOptions: 'By Customer,Included in OSC Scope' },
  { id: 'cover_40', pageName: '1.0 Basic Information', categoryName: '1.6 Delivery & Logistics', fieldName: 'Delivery Term for FMT', fieldType: 'dropdown', dropdownOptions: 'EXW,FOB,DDP,DDU,CIF' },
  { id: 'cover_41', pageName: '1.0 Basic Information', categoryName: '1.6 Delivery & Logistics', fieldName: 'Destination delivered by OSC', fieldType: 'dropdown', dropdownOptions: 'Direct delivery to the project site,Temporary storage at destination,Others' },
  { id: 'cover_42', pageName: '1.0 Basic Information', categoryName: '1.6 Delivery & Logistics', fieldName: 'Means of transport', fieldType: 'dropdown', dropdownOptions: 'ground transport,ocean freight,air freight' },
  { id: 'cover_43', pageName: '1.0 Basic Information', categoryName: '1.6 Delivery & Logistics', fieldName: 'Basic Packaging requirements', fieldType: 'dropdown', dropdownOptions: 'Leave to the FMT,Bare packing,Case with blue sheet,Crate packing,Half crate packing,Pallet with plastic warp,Pallet with plastic warp and blue sheet,Vacuum packing' },
  
  { id: 'cover_122', pageName: '1.0 Basic Information', categoryName: '1.7 Documentation', fieldName: 'Final Signature', fieldType: 'signature' },

  // Page 2: Technical Specs
  { id: 'sheet_a_5', pageName: '2.0 Technical Specs', fieldName: 'Other', fieldType: 'text', placeholder: 'Specify other requirements' },
  { id: 'sheet_a_6', pageName: '2.0 Technical Specs', fieldName: 'SWGR Install Location', fieldType: 'dropdown', dropdownOptions: 'Indoor,Outdoor' },
  { id: 'sheet_a_7', pageName: '2.0 Technical Specs', fieldName: 'Ambient Temp. Condition - Min', fieldType: 'number', placeholder: '°C' },
  { id: 'sheet_a_8', pageName: '2.0 Technical Specs', fieldName: 'Ambient Temp. Condition - Max', fieldType: 'number', placeholder: '°C' },
  { id: 'sheet_a_9', pageName: '2.0 Technical Specs', fieldName: 'Maximum Humidity', fieldType: 'number', placeholder: '%' },
  { id: 'sheet_a_10', pageName: '2.0 Technical Specs', fieldName: 'Hazardous Area', fieldType: 'dropdown', dropdownOptions: 'Yes,No' },
  { id: 'sheet_a_11', pageName: '2.0 Technical Specs', fieldName: 'Corrosive Gas', fieldType: 'dropdown', dropdownOptions: 'Yes,No' },
  { id: 'sheet_a_12', pageName: '2.0 Technical Specs', fieldName: 'Altitude', fieldType: 'number', placeholder: 'meters' },
  { id: 'sheet_a_13', pageName: '2.0 Technical Specs', fieldName: 'Busbar Material', fieldType: 'dropdown', dropdownOptions: 'Copper,Aluminum' },
  { id: 'sheet_a_14', pageName: '2.0 Technical Specs', fieldName: 'Cable Entry', fieldType: 'dropdown', dropdownOptions: 'Top,Bottom' },
  { id: 'sheet_a_15', pageName: '2.0 Technical Specs', fieldName: 'Control Source', fieldType: 'dropdown', dropdownOptions: 'AC 110V,DC 110V' },
  { id: 'sheet_a_16', pageName: '2.0 Technical Specs', fieldName: 'Rated Voltage', fieldType: 'number', required: true, placeholder: 'kV' },
  { id: 'sheet_a_17', pageName: '2.0 Technical Specs', fieldName: 'Rated Current', fieldType: 'number', required: true, placeholder: 'A' },
  { id: 'sheet_a_18', pageName: '2.0 Technical Specs', fieldName: 'IP Rating', fieldType: 'text', required: true, placeholder: 'e.g., IP4X' },
]


function generateHierarchicalIds(fields: Omit<RFQFieldData, 'hierarchicalId' | 'originalIndex' | 'currentIndex'>[]): RFQFieldData[] {
  const pageCounters: { [key: string]: number } = {
    '1.0 Basic Information': 1,
    '2.0 Technical Specs': 2
  }
  
  const fieldCounters: { [key: string]: number } = {}
  
  return fields.map((field, index) => {
    const pageIndex = pageCounters[field.pageName]
    
    if (!fieldCounters[field.pageName]) {
      fieldCounters[field.pageName] = 0
    }
    
    fieldCounters[field.pageName]++
    const fieldIndex = fieldCounters[field.pageName]
    
    return {
      ...field,
      hierarchicalId: `${pageIndex}.${fieldIndex}`,
      originalIndex: index,
      currentIndex: index,
    }
  })
}

export const RFQ_COMPLETE_FIELDS_WITH_HIERARCHY = generateHierarchicalIds(RFQ_COMPLETE_FIELDS)