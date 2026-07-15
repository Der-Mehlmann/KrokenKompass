port module TestVsp exposing (main)

import Json.Decode as Decode
import Platform

type alias VspUnit =
    { name : String }

decodeVspUnits : Decode.Decoder (List VspUnit)
decodeVspUnits =
    Decode.list (Decode.map VspUnit (Decode.field "name" Decode.string))

port sendResult : String -> Cmd msg

main =
    Platform.worker
        { init = \flags -> ( (), sendResult (testDecode flags) )
        , update = \_ model -> ( model, Cmd.none )
        , subscriptions = \_ -> Sub.none
        }

testDecode : String -> String
testDecode jsonString =
    case Decode.decodeString decodeVspUnits jsonString of
        Ok units ->
            "OK: " ++ String.fromInt (List.length units)
        Err err ->
            "ERR: " ++ Decode.errorToString err
