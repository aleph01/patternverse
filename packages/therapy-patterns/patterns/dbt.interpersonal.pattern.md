:language 1
:title "DBT · Clarify a request or boundary"
:output outcome
safety = !choose {
    :option ordinary "A manageable everyday interaction"
    :option unsafe "There may be coercion or danger"
    Is this an interaction where considering a request or boundary feels safe enough? If direct communication could put you at risk, do not rehearse confrontation here.
}
?branch {
  :when safety.value == "ordinary" {
    situation = !ask {
        What happened, in brief, without guessing the other person's motives?
    }
    objective = !ask {
        What concrete request or boundary would you like to express?
    }
    relationship = !ask {
        What, if anything, do you want to protect about this relationship?
    }
    respect = !ask {
        What matters for your self-respect here, including any limit you do not want to cross?
    }
    priority = !choose {
        :option objective "The concrete objective"
        :option relationship "The relationship"
        :option respect "My self-respect"
        :option balance "A balance, without choosing one"
        Which deserves most attention in this particular interaction? All three can matter.
    }
    wording = !ask {
        In your own words, how could you state the relevant fact and your request or boundary clearly, without threats or an apology for having needs?
    }
    fallback = !ask {
        If the response is not what you hope, what safe limit, pause or support could you choose? You cannot guarantee agreement.
    }
    !show {
        Your draft, not a message sent: {{wording}}
        Your fallback: {{fallback}}
        You can revise privately or decide not to use it. No contact has been made.
    }
    outcome = "drafted"
    -> end
  }
  :else {
    !show {
        Set aside the communication exercise. Prioritize safety and consider qualified support rather than direct confrontation. For immediate danger, contact local emergency services; a trusted person or local specialist service may help. Mira cannot assess risk or provide emergency care.
    }
    outcome = "support_requested"
    -> end
  }
}
