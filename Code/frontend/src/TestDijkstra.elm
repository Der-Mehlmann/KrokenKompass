port module TestDijkstra exposing (main)

import Dijkstra
import GraphData exposing (decodeGraphData, GraphData)
import Json.Decode as Decode
import Platform

port sendResult : String -> Cmd msg

main =
    Platform.worker
        { init = \flags -> ( (), sendResult (testDijkstra flags) )
        , update = \_ model -> ( model, Cmd.none )
        , subscriptions = \_ -> Sub.none
        }

testDijkstra : String -> String
testDijkstra jsonString =
    case Decode.decodeString decodeGraphData jsonString of
        Ok data ->
            case Dijkstra.shortestPath "7723_00_039__1" "7723_00_038__2" data.graph of
                Just path -> "PATH: " ++ String.join " -> " path
                Nothing -> "NO PATH FOUND!"
        Err _ ->
            "DECODE ERR"
