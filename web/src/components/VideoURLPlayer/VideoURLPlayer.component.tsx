import ReactPlayer from 'react-player'
import styled from 'styled-components'

interface VideoURLPlayerProps {
  title: string;
}

export const VideoURLPlayer = ({title}: VideoURLPlayerProps) => {

  return (
    <VideoContainerWrapper>
      <VideoContainer>
        <ReactPlayer
          url={title}
          config={{
            youtube: {
              playerVars: {
                showInfo: 1
              }
            }
          }}

        />
      </VideoContainer>
    </VideoContainerWrapper>
  )

}

const VideoContainerWrapper = styled.div`
  margin: 20px 0px;
  position: relative;

  padding-top: 56.25%; /* Player ratio: 100 / (1280 / 720) */
`

const VideoContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
`