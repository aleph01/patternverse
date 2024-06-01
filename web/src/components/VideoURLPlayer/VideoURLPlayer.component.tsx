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
          width='100%'
          height='100%'
        />
      </VideoContainer>
    </VideoContainerWrapper>
  )

}

const VideoContainerWrapper = styled.div`
position: relative;
padding-top: 56.25%; /* Player ratio: 100 / (1280 / 720) */
`

export const VideoContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;

  margin: 24px auto;
`;