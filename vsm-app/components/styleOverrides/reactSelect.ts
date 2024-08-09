interface StyleOptions {
  maxWidth?: string
  minWidth?: string
}

export const reactSelectOptionStyle = (props?: StyleOptions | undefined) => {

  return ({
    multiValueLabel: (styles: any) => ({
      ...styles,
      whiteSpace: 'wrap',
    }),
    control: (styles: any) => ({
      ...styles,
      minWidth: props?.minWidth || 'inherit',
      maxWidth: props?.maxWidth || 'inherit',
      zIndex: 9999
    }),
    menuPortal: (styles: any) => ({ ...styles, zIndex: 9999 })
  })
}