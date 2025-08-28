export type FieldType = 'text' | 'dropdown' | 'date' | 'number' | 'checkbox' | 'email' | 'multiline' | 'signature'

export type PageType = '1.0 Basic Information' | '2.0 Technical Specs'

export interface SubField {
  id: string
  order: number
  label: string
  type: 'text' | 'number' | 'date' | 'dropdown'
  required: boolean
  placeholder?: string
  value?: string
  dropdownOptions?: string
}

export interface RFQFieldData {
  id: string
  hierarchicalId: string
  originalIndex: number
  currentIndex: number
  pageName: PageType
  categoryName?: string
  fieldName: string
  fieldType: FieldType
  dropdownOptions?: string
  required?: boolean
  currentValue?: any
  lastModified?: string
  modifiedBy?: string
  placeholder?: string
  justUpdated?: boolean
  readOnly?: boolean
  hasFixedValue?: boolean
  fixedValue?: any
  defaultValue?: any
  isLocked?: boolean
  helpText?: string
  showHelpOn?: ('hover' | 'focus')[]
  isMultipleInput?: boolean
  subFields?: SubField[]
}