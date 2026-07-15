module GraphData exposing (GraphData, NodeMeta, decodeGraphData, getBestNodeId)

import Dict exposing (Dict)
import Json.Decode as Decode exposing (Decoder, string, float, dict, list, field, map5)

type alias NodeMeta =
    { name : String
    , typ : String
    , rawTyp : String
    , gebaeude : String
    , etage : String
    }

type alias GraphData =
    { graph : Dict String (Dict String Float)
    , centroids : Dict String (List Float)
    , nodeMeta : Dict String NodeMeta
    }

decodeNodeMeta : Decoder NodeMeta
decodeNodeMeta =
    map5 NodeMeta
        (field "name" string)
        (field "typ" string)
        (field "rawTyp" string)
        (field "gebaeude" string)
        (field "etage" string)

decodeGraphData : Decoder GraphData
decodeGraphData =
    Decode.map3 GraphData
        (field "graph" (dict (dict float)))
        (field "centroids" (dict (list float)))
        (field "nodeMeta" (dict decodeNodeMeta))

priorisiereTyp : String -> String -> Int
priorisiereTyp typ zielTyp =
    if zielTyp /= "" && typ == zielTyp then
        0
    else if typ == "tuer" then
        1
    else if typ == "flur" then
        2
    else if typ == "vertikal" then
        3
    else
        4

getBestNodeId : String -> String -> GraphData -> Maybe String
getBestNodeId roomName zielTyp graphData =
    let
        matchingNodes =
            Dict.toList graphData.nodeMeta
                |> List.filter (\( _, meta ) -> meta.name == roomName)

        bestNode =
            matchingNodes
                |> List.sortBy (\( _, meta ) -> priorisiereTyp meta.typ zielTyp)
                |> List.head
    in
    case bestNode of
        Just ( id, _ ) ->
            Just id
        Nothing ->
            Nothing
