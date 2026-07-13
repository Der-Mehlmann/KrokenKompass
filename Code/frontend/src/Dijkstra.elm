module Dijkstra exposing (shortestPath)

import Dict exposing (Dict)

type alias Graph =
    Dict String (Dict String Float)

shortestPath : String -> String -> Graph -> Maybe (List String)
shortestPath start ziel graph =
    if not (Dict.member start graph) || not (Dict.member ziel graph) then
        Nothing
    else
        let
            initialCosts =
                Dict.singleton start 0.0

            initialParents =
                Dict.empty

            initialProcessed =
                Dict.empty

            loop : Dict String Float -> Dict String String -> Dict String () -> ( Dict String String, Dict String () )
            loop costs parents processed =
                let
                    -- Find lowest cost unvisited node
                    lowestNodeMaybe =
                        Dict.foldl
                            (\node cost acc ->
                                if Dict.member node processed then
                                    acc
                                else
                                    case acc of
                                        Nothing ->
                                            Just ( node, cost )

                                        Just ( bestNode, bestCost ) ->
                                            if cost < bestCost then
                                                Just ( node, cost )
                                            else
                                                Just ( bestNode, bestCost )
                            )
                            Nothing
                            costs
                in
                case lowestNodeMaybe of
                    Nothing ->
                        ( parents, processed )

                    Just ( node, cost ) ->
                        let
                            neighbors =
                                Dict.get node graph
                                    |> Maybe.withDefault Dict.empty

                            ( newCosts, newParents ) =
                                Dict.foldl
                                    (\neighbor edgeCost ( cAcc, pAcc ) ->
                                        let
                                            newCost =
                                                cost + edgeCost

                                            oldCost =
                                                Dict.get neighbor cAcc
                                                    |> Maybe.withDefault (1.0 / 0.0) -- Infinity
                                        in
                                        if newCost < oldCost then
                                            ( Dict.insert neighbor newCost cAcc
                                            , Dict.insert neighbor node pAcc
                                            )
                                        else
                                            ( cAcc, pAcc )
                                    )
                                    ( costs, parents )
                                    neighbors

                            newProcessed =
                                Dict.insert node () processed
                        in
                        if node == ziel then
                            ( newParents, newProcessed )
                        else
                            loop newCosts newParents newProcessed
        in
        let
            ( finalParents, _ ) =
                loop initialCosts initialParents initialProcessed
        in
        buildPath ziel finalParents []

buildPath : String -> Dict String String -> List String -> Maybe (List String)
buildPath current parents acc =
    case Dict.get current parents of
        Nothing ->
            if List.isEmpty acc then
                Nothing
            else
                Just (current :: acc)

        Just parent ->
            buildPath parent parents (current :: acc)
