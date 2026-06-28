module Main exposing (..)

import Browser
import Html exposing (..)
import Html.Events exposing (onInput)
import Http
import Json.Decode as Decode


type alias Model =
    { input : String
    , result : String
    }


init : Model
init =
    { input = ""
    , result = ""
    }


type Msg
    = Change String
    | GotResult (Result Http.Error String)


update msg model =
    case msg of
        Change value ->
            ( { model | input = value }, Cmd.none )

        GotResult (Ok data) ->
            ( { model | result = data }, Cmd.none )

        GotResult (Err _) ->
            ( { model | result = "Fehler" }, Cmd.none )


view model =
    div []
        [ input [ onInput Change ] []
        , button [ Html.Events.onClick (fetchRoom model.input) ] [ text "Suchen" ]
        , div [] [ text model.result ]
        ]


fetchRoom name =
    Http.get
        { url = "http://localhost:3000/room?name=" ++ name
        , expect = Http.expectString GotResult
        }


main =
    Browser.sandbox
        { init = init
        , update = update
        , view = view
        }