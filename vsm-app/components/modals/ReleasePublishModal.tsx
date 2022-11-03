import styled from 'styled-components'
import ReactModal from 'react-modal'
import { Button } from '@/components/buttons/Button'
import LoadingIndicator from '@/components/LoadingIndicator'

interface ModalInfo {
  actionType: 'release' | 'publish',
  isOpen: boolean,
  handleCancelModal: () => void,
  handleModalAction: Function,
  loading: boolean,
  program:  fhir4.Library | null
}

const modalText = {
  publish: {
    title: 'Publish Program',
    text: 'Publishing ',
    actionText: 'Would you like to continue?',
    modalLoadingText: (
      <>
        Publishing may take up to a minute.<br/>Please keep this window open until it completes.
      </> 
    )
  },
  release: {
    title: 'Release Program',
    text: 'Releasing this program will mark it as active and allow others to use it as a template.',
    actionText: 'Would you like to continue?',
    modalLoadingText: (
      <>
        Releasing may take up to a minute.<br/>Please keep this window open until it completes.
      </> 
    )
  }
}

const customModalStyles = {
  overlay: {
    zIndex: 2,
  },
  content: {
    maxWidth: '500px',
    margin: '0 auto',
    height: 'fit-content',
    paddingBottom: '48px'
  }
}

const ReleasePublishModal = ({
  isOpen,
  actionType,
  loading,
  handleCancelModal,
  handleModalAction,
  program
}: ModalInfo) => {
  const { title, text, actionText, modalLoadingText } = modalText[actionType]
  return (
    <ReactModal
      isOpen={isOpen}
      style={customModalStyles}
    >
      <ModalContent>
        <div>
          <ModalTitle>{ title }</ModalTitle>
          <ModalText>{ text }</ModalText>
          <ModalText>{ actionText }</ModalText>
          <ButtonGroup>
            <Button
              text='Cancel'
              onClick={() => handleCancelModal()}
              style={{ backgroundColor: 'var(--neutral-300)' }}
              />
            <Button
              text={`YES, ${actionType}`}
              onClick={() => (handleModalAction(actionType, program))}
              />
          </ButtonGroup>
          {
            loading &&
            <ModalOverlay>
                <LoadingContainer>
                  {modalLoadingText}
                  <LoadingIndicator size='large' />
                </LoadingContainer>
            </ModalOverlay>
          }
        </div>
      </ModalContent>
    </ReactModal>
  )
}

const ModalOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(200, 200, 200, 0.5);
  backdrop-filter: blur(10px);

`

const ModalContent = styled.div`
  justify-content: center;
  text-align: center;
`

const ModalTitle = styled.h1`
  margin-bottom: 36px;
`

const ModalText = styled.p`
  max-width: 400px;
  line-height: 140%;
  margin: 0 auto;
  margin-bottom: 12px;
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 24px;
  justify-content: center;
  margin-top: 36px;
`

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: center;
  align-items: center;
`

export { ReleasePublishModal }