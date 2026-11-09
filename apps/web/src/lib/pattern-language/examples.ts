/** Complete examples used by the public language reference and its compiler checks. */
export const example = `:language 1
:title "A small check-in"

focus = !ask {
    What would you like to explore?
}

!show {
    You named {{focus}}. Take a moment with that.
}

-> end`;

export const timerExample = `:language 1
:title "A timed reflection"

reflection = !form {
    :title "Take a moment"
    !show {
        Consider what you would like to do next.
    }
    thought = !ask {
        What would you like to try?
    }
    notes = !ask [optional] {
        Anything else you want to remember?
    }
    !timer pause {
        :duration 60
        :blocking true
        :sticky false
        Start when you are ready.
    }
}

-> end`;

export const typesExample = `:language 1
:output entry: {topic: text, ratings: list[number]}

topic: text = !ask {
    What would you like to explore?
}
ratings: list[number] = []
entry = {topic: topic, ratings: ratings}
!show {
    Topic: {{entry.topic}}
}
-> end`;

export const optionalExample = `:language 1
:input note: Optional[text]
:output description: text

?branch {
    :when note != None {
        description = trim(note)
    }
    :else {
        description = "No note was supplied."
    }
}
!show {
    {{description}}
}
-> end`;

export const decisionExample = `:language 1

route = !choose {
    Where would you like to begin?
    - explore: "Explore a situation"
    - finish: "Leave it here"
}
?match route {
    :case explore {
        note = !ask {
            What would you like to explore?
        }
        !show {
            You named {{note}}.
        }
    }
    :case finish {
        -> end
    }
}
-> end`;

export const coalesceExample = `:language 1

notes: list[text] = []
summary = first(notes) ?? "No notes yet."
note: Optional[text] = ""
kept = note ?? "This fallback is not used."
!show {
    Summary: {{summary}}
    Present empty text stays empty: [{{kept}}]
}
-> end`;

export const helperExample = `:language 1
:output cleaned: list[text]

fn clean(value: text) -> text => value |> trim |> normalize_whitespace

notes = ["  Take a pause  ", "Ask   for help"]
cleaned = notes |>> clean
!show {{cleaned}} {
}
-> end`;

export const placeholderLambdaExample = `:language 1

threshold = 7
scores = [2, 8, 9]
high = filter(scores, _ >= threshold)
names = map([{name: "Pause"}, {name: "Ask for help"}], _.name)
total = fold(scores, 0, _ + _)
!show {
    High scores: {{high}}
    Names: {{names}}
    Total: {{total}}
}
-> end`;

export const namedLambdaExample = `:language 1

threshold = 7
scores = [2, 8, 9]
squares = map(scores, n => n * n)
middle = filter(scores, n => n >= 3 and n <= 8)
groups = [[2, 8], [7, 9]]
filtered = map(groups, group => filter(group, _ >= threshold))
!show {
    Squares: {{squares}}
    Middle scores: {{middle}}
    Filtered groups: {{filtered}}
}
-> end`;

export const reduceExample = `:language 1

scores = [2, 4, 8]
total = reduce(scores, _ + _) ?? 0
empty: list[number] = []
fallback = reduce(empty, (total, value) => total + value) ?? 0
!show {
    Total: {{total}}
    Explicit empty-list fallback: {{fallback}}
}
-> end`;

export const collectionExample = `:language 1
:output answers

questions = ["What matters today?", "What is one small next step?"]
answers = each question in questions {
    response = !ask {
        {{question}}
    }
    -> yield {question: question, answer: trim(response)}
}
!show {{answers}} {
}
-> end`;

export const flowExample = `:language 1

flow ask_topic {
    :input topic: text
    :output answer: text
    answer = !ask {
        What comes to mind about {{topic}}?
    }
    -> end
}

result = !use ask_topic {
    :with topic = "today"
}
!show {
    You wrote: {{result.answer}}
}
-> end`;

export const displayExample = `:language 1

ideas = [
    {name: "Take a pause", effort: 1, impact: 3, category: "Rest"},
    {name: "Ask for help", effort: 2, impact: 5, category: "Support"},
]
!show {{ideas}} {
    :map effort, impact
    :group category
    :order impact desc
}
-> end`;

export const semanticExample = `:language 1
type Intent = answer | question | other
classifier intent -> Intent {
    :context prompt text
    :case answer "Answers the supplied prompt."
    :case question "Asks what the prompt means."
    :fallback other
}

prompt = "What would you like to explore?"
message = !ask {
    {{prompt}}
}
meaning = message ?~ intent {
    :with prompt
}
?match meaning {
    :case answer {
        !show {
            Thank you for sharing.
        }
    }
    :case question {
        !show {
            The question invites you to choose a topic.
        }
    }
    :case other {
        !show {
            We can leave that open for now.
        }
    }
}
-> end`;

export const refineExample = `:language 1
:output reviewed

original = "I would like a little more space."
reviewed = !refine[rounds=2] original {
    :as current
    edited = !ask {
        How would you change this wording?
        {{current}}
    }
    -> propose edited
}
!show {
    Wording: {{reviewed.value}}
    Review outcome: {{reviewed.outcome.label}}
}
-> end`;

export const markdownExample = String.raw`:language 1

topic = "A small next step"
!show {
    ## {{topic}}

    **Notice** what matters, then choose one action.

    - Make it manageable.
    - Leave room to change your mind.

    > There is no need to solve everything at once.

    Literal syntax: \!ask and \{{not_a_reference}}.
}
-> end`;

export const expressionExample = `:language 1

score = 3 * (2 + 1)
available = score >= 7 and not false
entry = {score: score, available: available}
!show {
    Score: {{entry.score}}
    Enough capacity: {{entry.available}}
}
-> end`;

export const inputExample = `:language 1
:input topic: text
:output answer: text

answer = !ask {
    What is one useful next step for {{topic}}?
}
!show {
    Your next step: {{answer}}
}
-> end`;

export const ratingExample = `:language 1
:output energy: number

energy = !rate 0..10 {
    :low "Very little"
    :high "Plenty"
    How much energy is available today?
}
!show {
    You rated your energy {{energy}} out of 10.
}
-> end`;

export const selectionExample = `:language 1

selected = !choose [multi, min=0, max=2] {
    Which possibilities would you like to consider?
    - pause: "Take a pause"
    - ask: "Ask for help"
    - plan: "Make a small plan"
}
ordered = !rank [from=selected] {
    What order would you like to try them in?
}
!show {{ordered}} {
}
-> end`;

export const branchExample = `:language 1

energy = !rate 0..10 {
    How much energy is available?
}
?branch {
    :when energy >= 7 {
        suggestion = "Choose one focused action."
    }
    :when energy >= 3 {
        suggestion = "Make the next step smaller."
    }
    :else {
        suggestion = "Make room to rest."
    }
}
!show {
    {{suggestion}}
}
-> end`;

export const timerOnlyExample = `:language 1

pause = !timer {
    :duration 10
    :adjustable true
    :min 5
    :max 120
    :blocking false
    :sticky false
    Take a brief pause. Continue when you are ready.
}
!show {
    Continued after {{pause.elapsed_seconds}} seconds.
}
-> end`;

export const openCollectionExample = `:language 1

ideas = !collect {
    :min 0
    :max 3
    idea = !ask {
        What is one small idea?
    }
    effort = !rate 1..5 {
        How much effort would {{idea}} take?
    }
    -> yield {name: idea, effort: effort}
}
!show {{ideas}} {
    :order effort asc
}
-> end`;

export const loopExample = `:language 1

initial = "a manageable next step"
?loop[3] topic = initial {
    next = !ask {
        What would make {{topic}} a little easier?
    }
    -> repeat next
}
!show {
    You can leave the loop at any point.
}
-> end`;

export const imageExample = `:language 1

!image {
    :url "https://patternverse.org/icons/patternverse-mark.png"
    :alt "The Patternverse mark: a geometric leaf shape."
    :title "An image with a caption"

    Add a short caption or an instruction here.
}
-> end`;

export const videoExample = `:language 1

!video {
    :url "https://youtu.be/M7lc1UVf-VE"
    :title "A video excerpt"
    :start "0:10"
    :end "0:30"
    :autoplay false
    :muted false
    :loop false
    :captions "en"

    Watch the excerpt, then notice what stood out.
}
-> end`;

export const agentExample = `:language 1

topic = !ask {
    What would you like help planning?
}
result = !agent {
    :returns {suggestion: text, confidence: number}
    :context topic
    Suggest one manageable next step for the supplied topic.
}
!show {
    Suggestion: {{result.suggestion}}
    Model confidence: {{result.confidence}}
}
-> end`;

export const realizationExample = `:language 1

answer = !ask {
    ~ Ask what would help the person take a small next step.
}
!show {
    You named {{answer}}.
}
-> end`;

export const suggestionExample = `:language 1

items = [
    {name: "Take a pause", score: 2},
    {name: "Ask for help", score: 5},
]
suggestion = items |> rank ~ {
    Order by score, highest first.
}
?match suggestion.outcome {
    :case decided {
        !show {{suggestion.items}} {
        }
    }
    :case uncertain {
        !show {
            No confident suggestion is available.
        }
    }
}
-> end`;

export const eventExample = `:language 1

flow handle_message {
    :input message: text
    :input prompt: text
    :output disposition: text
    ?branch {
        :when message == "help" {
            !show {
                Name any manageable topic. Your answer can be brief.
            }
            disposition = "handled"
        }
        :else {
            disposition = "pass"
        }
    }
    -> end
}
events {
    on user.message -> handle_message
}
answer = !ask {
    What would you like to explore? Type help for an explanation.
}
!show {
    You chose {{answer}}.
}
-> end`;

export const dataImportExample = `:language 1
:import materials from "commons:materials"

items = records(materials)
!show {{items}} {
    :order name asc
}
-> end`;

export const pinnedImportExample = `:language 1
:import "artifact-id@exact-compiled-revision" as helper

result = !use helper {
    :with topic = "today"
}
!show {
    {{result.answer}}
}
-> end`;
