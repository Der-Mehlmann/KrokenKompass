port module TestDecode exposing (main)

import GraphData exposing (decodeGraphData)
import Json.Decode as Decode
import Platform

port sendResult : String -> Cmd msg

type Msg = DecodeIt

main =
    Platform.worker
        { init = \flags -> ( (), sendResult (testDecode flags) )
        , update = \_ model -> ( model, Cmd.none )
        , subscriptions = \_ -> Sub.none
        }

testDecode : String -> String
testDecode jsonString =
    case Decode.decodeString decodeGraphData jsonString of
        Ok _ ->
            "OK"
        Err err ->
            "ERR: " ++ Decode.errorToString err
