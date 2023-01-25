import styled from 'styled-components'
import Image from 'next/image'
import { StyledLabel as StyledInputLabel, ReadOnlyContainer } from './SearchInput'

interface InputProps {
  minWidth?: number;
  minHeight?: number;
  onChange: React.ChangeEventHandler | undefined;
}

const Input = styled.textarea<InputProps>`
  min-width: ${props => props.minWidth || 0}px;
  padding: 4px 6px;
  background-color: white;
  border: 2px solid transparent;
  border-bottom: 2px solid var(--theme-300);
`

interface LabelProps {
  children: string;
}

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
  placeholder?: string,
  onChange?: React.ChangeEventHandler,
  required?: boolean,
  currentValue?: string,
  label?: string,
  id?: string,
  def?: string,
  minWidth?: number,
  minHeight?: number,
  hasIcon?: boolean,
  includeInfo?: boolean,
  info?: string,
  readonly?: boolean,
  style?: React.CSSProperties
}

interface LabelProps {
  for: string
}

const TextArea = ({
  placeholder,
  onChange,
  currentValue,
  label,
  required = false,
  id,
  def,
  minWidth,
  minHeight,
  includeInfo,
  info,
  readonly = false,
  style={}
}: Props) => {
  return (
    <Container style={style}>
      <FlexRow>
      {
        (label !== undefined && id !== undefined) &&
        <StyledInputLabel>
          {label}
          {required && !readonly && <sup style={{color: 'red'}}>*</sup>}
        </StyledInputLabel>
      }
      { includeInfo && (
        <InfoContainer>
          <Image width={16} height={16} alt='' src='/images/information-circle.svg' />
          <TooltipContainer>
            <ToolTipText>
              {info}
            </ToolTipText>
          </TooltipContainer>
        </InfoContainer>
      )}
      </FlexRow>
      {readonly ? (
        <ReadOnlyContainer minWidth={minWidth}>
          {def || placeholder}
        </ReadOnlyContainer>
      ): (
        <Input
          name={id}
          placeholder={placeholder}
          value={currentValue}
          onChange={onChange}
          minWidth={minWidth}
          minHeight={minHeight}
          defaultValue={def}
        /> 
      )}
    </Container>
  )
}

export { TextArea }