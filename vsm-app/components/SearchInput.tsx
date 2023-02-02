import styled from 'styled-components'
import Image from 'next/image'

interface InputProps {
  minWidth?: number;
  onChange: React.ChangeEventHandler | undefined;
}

interface ReadOnlyContainerProps {
  minWidth?: number
}

const Input = styled.input<InputProps>`
  min-width: ${props => props.minWidth || 0}px;
  padding: 4px 6px;
  background-color: white;
  border: 2px solid transparent;
  border-bottom: 2px solid var(--theme-300);
`

export const StyledLabel = styled.label`
  margin-bottom: 6px;
  font-size: 14px;
  color: var(--theme-500);
  display: inline-block;
`

const Container = styled.div`
  display: flex;
  flex-direction: column;
`

const FlexRow = styled.div`
  display: flex;
  flex-direction: row;
`

const TooltipContainer = styled.div`
  position: absolute;
  bottom: 18px;
  background-color: white;
  padding: 2px 8px;
  width: 150px;
  display: none;
`

export const ReadOnlyContainer = styled.div<ReadOnlyContainerProps>`
  min-width: ${props => props?.minWidth ? props.minWidth + 'px' : 'auto'};
`

const InfoContainer = styled.div`
  position: relative;
  transform: translateY(-8px);
  &:hover {
    cursor: pointer;
  }
  &:hover ${TooltipContainer} {
    display: unset;
  }
`

const ToolTipText = styled.p`
  font-size: 80%;
`

interface Props {
  placeholder?: string
  onChange?: React.ChangeEventHandler
  label?: string
  id?: string
  value?: string
  def?: string
  minWidth?: number
  hasIcon?: boolean
  disabled?: boolean
  info?: string
  style?: React.CSSProperties
  readonly?: boolean
  required?: boolean
}

interface LabelProps {
  id?: string
  label?: string
  required?: boolean
  readonly?: boolean
  info?: string
}

export const Label = ({ id, label, required, readonly, info }: LabelProps) => {

  return (
    <>
    {  (label !== undefined && id !== undefined) &&
      <StyledLabel>
        {label}
        {required && !readonly && <sup style={{color: 'red'}}>*</sup>}
      </StyledLabel>
    }
    { info && (
      <InfoContainer>
        <Image width={16} height={16} alt='' src='/images/information-circle.svg' />
        <TooltipContainer>
          <ToolTipText>
            {info}
          </ToolTipText>
        </TooltipContainer>
      </InfoContainer>
    )}
    </>
  )
}

const SearchInput = ({
  placeholder,
  onChange,
  label,
  value,
  def,
  id,
  style,
  minWidth,
  info,
  disabled = false,
  readonly = false,
  required = false
}: Props) => {
  return (
    <Container>
      <FlexRow>
        <Label
          id={id}
          info={info}
          label={label}
          required={required}
          readonly={readonly}
        />
      </FlexRow>
      { readonly ? (
        <ReadOnlyContainer minWidth={minWidth}>
          {def || placeholder}
        </ReadOnlyContainer>
      ) : (
        <Input
          id={id}
          placeholder={placeholder}
          onChange={onChange}
          minWidth={minWidth}
          disabled={disabled}
          value={value}
          defaultValue={def}
          style={style}
          required={required}
        />
      ) }
    </Container>
  )
}

export { SearchInput }